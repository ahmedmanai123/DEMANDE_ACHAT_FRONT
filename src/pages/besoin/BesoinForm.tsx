import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Card as MuiCard,
	CardContent as MuiCardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	type SelectChangeEvent,
	Slider,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import apiClient from "@/api/apiClient";
import {
	articleBesoinService,
	besoinService,
	getChampsLibreArticleBesoin,
	getChampsLibreBesoin,
	getTypesBesoinUsers,
	referenceService,
	validationService,
} from "@/services/besoinService";
import { useUserInfo } from "@/store/userStore";
import type { IArticle } from "@/types/article";
import {
	Etat_Besoin,
	type ChampLibreDto,
	type IAffaire,
	type IBesoin,
	type IBesoinArticle,
	type IBesoinType,
	type IDepot,
	type IValidateurBesoin,
	type Type_Validation,
} from "@/types/besoin";
import { ETAT_BESOIN_LABELS, STATUT_LABELS } from "@/utils/besoin.utils";

/** Style commun : champs compacts, coins arrondis, liste déroulante lisible. */
const besoinTextFieldDefaults = {
	size: "small" as const,
	fullWidth: true,
	sx: {
		"& .MuiOutlinedInput-root": {
			borderRadius: 2,
		},
		"& .MuiInputLabel-root": {
			fontWeight: 500,
		},
	},
};

const besoinSelectSx = {
	borderRadius: 2,
	"& .MuiOutlinedInput-notchedOutline": {
		borderColor: "divider",
	},
	"&:hover .MuiOutlinedInput-notchedOutline": {
		borderColor: "primary.main",
	},
	"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
		borderWidth: 2,
	},
};

/** MUI v9 : menu du Select via MenuProps.slotProps (plus PaperProps). */
const besoinSelectMenuProps = {
	slotProps: {
		paper: {
			sx: {
				borderRadius: 2,
				mt: 0.5,
				maxHeight: 320,
				boxShadow: 3,
			},
		},
	},
};

const besoinDropdownLabelSx = {
	fontWeight: 600,
	fontSize: "0.8125rem",
	color: "text.secondary",
	mb: 0.5,
	display: "block",
};

const accordionBlockSx = {
	borderRadius: 2,
	border: 1,
	borderColor: "divider",
	boxShadow: 1,
	overflow: "hidden",
	"&:before": { display: "none" },
};

interface Props {
	b_No: number;
	onBack: () => void;
}

const degreeImportanceLabels: Record<number, string> = {
	0: "Non définie",
	1: "Basse",
	2: "Moyenne",
	3: "Haute",
	4: "Très haute",
	5: "Maximum",
};

const asNumber = (value: unknown): number => {
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
	return 0;
};

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const asBoolean = (value: unknown): boolean => value === true || value === "true";

const formatDateForInput = (value: unknown, withTime = false): string => {
	if (!value) return "";
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return "";
	if (withTime) return date.toISOString().slice(0, 16);
	return date.toISOString().slice(0, 10);
};

const normalizeBesoin = (raw: unknown): IBesoin | null => {
	if (!raw || typeof raw !== "object") return null;
	const record = raw as Record<string, unknown>;
	const wrapped = record.besoin;
	if (wrapped && typeof wrapped === "object") return wrapped as IBesoin;
	return record as IBesoin;
};

const getUserDisplayName = (userInfo: unknown): string => {
	if (!userInfo || typeof userInfo !== "object") return "";
	const record = userInfo as Record<string, unknown>;
	return asString(
		record.userName ??
			record.username ??
			record.name ??
			record.fullName ??
			record.displayName ??
			record.US_UserIntitule,
	);
};

const getCurrentUserId = (userInfo: unknown): string => {
	if (!userInfo || typeof userInfo !== "object") return "";
	const record = userInfo as Record<string, unknown>;
	return asString(record.id ?? record.userId ?? record.sub ?? record.Id);
};

const getChampKey = (champ: ChampLibreDto, index: number): string =>
	asString(champ.CL_ChampLibre_View) || `champ_${index}`;

const mapChampValue = (champ: ChampLibreDto, value: string): ChampLibreDto => ({
	...champ,
	CL_ChampValue: value,
});

/** Extrait ref / désignation / unité depuis une ligne catalogue (PascalCase ou camelCase). */
const extractArticleCatalogFields = (row: IArticle): { ref: string; design: string; unite: string } => {
	const r = row as Record<string, unknown>;
	const ref = asString(row.aR_Ref ?? r.AR_Ref ?? r.aR_Ref);
	const design = asString(row.aR_Design ?? r.AR_Design ?? r.aR_Design);
	const unite = asString(
		r.aR_Unite ?? r.AR_Unite ?? r.BA_Unite ?? r.bA_Unite ?? r.u_IntituleUnite ?? r.U_IntituleUnite ?? "1",
	);
	return { ref, design, unite: unite || "1" };
};

export default function BesoinForm({ b_No, onBack }: Props) {
	const userInfo = useUserInfo();
	const currentUserId = useMemo(() => getCurrentUserId(userInfo), [userInfo]);
	const currentUserName = useMemo(() => getUserDisplayName(userInfo), [userInfo]);

	const [loadingPage, setLoadingPage] = useState(false);
	const [savingBesoin, setSavingBesoin] = useState(false);
	const [savingArticle, setSavingArticle] = useState(false);
	const [currentBesoinId, setCurrentBesoinId] = useState(b_No);
	const [files, setFiles] = useState<File[]>([]);
	const [typesBesoin, setTypesBesoin] = useState<IBesoinType[]>([]);
	const [depots, setDepots] = useState<IDepot[]>([]);
	const [affaires, setAffaires] = useState<IAffaire[]>([]);
	const [articles, setArticles] = useState<IBesoinArticle[]>([]);
	const [validateurs, setValidateurs] = useState<IValidateurBesoin[]>([]);
	const [champsLibreBesoin, setChampsLibreBesoin] = useState<ChampLibreDto[]>([]);
	const [champsLibreArticle, setChampsLibreArticle] = useState<ChampLibreDto[]>([]);
	const [infoTypeBesoin, setInfoTypeBesoin] = useState<IBesoinType | null>(null);
	const [editingArticle, setEditingArticle] = useState<IBesoinArticle | null>(null);
	const [articleForm, setArticleForm] = useState({
		bA_RefArticle: "",
		bA_DesigArticle: "",
		bA_Unite: "",
		bA_Quantite: 1,
		bA_QuantiteValider: 1,
	});
	const [formValues, setFormValues] = useState({
		b_No: 0,
		b_Numero: "",
		b_Date: formatDateForInput(new Date()),
		b_DateLivraison: formatDateForInput(new Date()),
		b_IdDemandeur: currentUserId,
		b_Demandeur: currentUserName,
		bT_Id: 0,
		b_Titre: "",
		b_Description: "",
		dE_No: "",
		cA_Num: "",
		b_DegreImportance: 1,
		b_Motif: "",
		b_NumeroOrgine: "",
		b_Etat_Besoin: Etat_Besoin.Brouillon,
		b_EtatRetour: 0,
	});

	/** Popup « choix article » (équivalent MVC Article + Action_View_Article.Choix + dE_No). */
	const [articlePickerOpen, setArticlePickerOpen] = useState(false);
	const [articlePickerLoading, setArticlePickerLoading] = useState(false);
	const [articlePickerRows, setArticlePickerRows] = useState<IArticle[]>([]);
	const [articlePickerTotal, setArticlePickerTotal] = useState(0);
	const [articlePickerPage, setArticlePickerPage] = useState(0);
	const [articlePickerPageSize, setArticlePickerPageSize] = useState(10);
	const [articlePickerSearchRef, setArticlePickerSearchRef] = useState("");
	const [articlePickerSearchDesign, setArticlePickerSearchDesign] = useState("");
	const [articlePickerTick, setArticlePickerTick] = useState(0);

	useEffect(() => {
		setCurrentBesoinId(b_No);
	}, [b_No]);

	const isCreateMode = currentBesoinId === 0;
	const currentEtat = asNumber(formValues.b_Etat_Besoin);
	const canEditBesoin =
		isCreateMode || currentEtat === Etat_Besoin.Brouillon || currentEtat === Etat_Besoin.Rectifier_Demande;
	const canEditArticles = currentBesoinId > 0 && canEditBesoin;
	const canConfirm = currentBesoinId > 0 && canEditBesoin;
	const canEditType = isCreateMode;
	const degreeEnabled =
		canEditBesoin && asBoolean((infoTypeBesoin as Record<string, unknown> | null)?.BT_ModifDegreImportance);

	const loadTypes = async (): Promise<void> => {
		try {
			const rows = await getTypesBesoinUsers();
			setTypesBesoin(Array.isArray(rows) ? rows : []);
		} catch {
			setTypesBesoin([]);
		}
	};

	const loadArticles = async (id: number): Promise<void> => {
		if (!id) {
			setArticles([]);
			return;
		}
		const rows = await articleBesoinService.getByBesoinId(id);
		setArticles(Array.isArray(rows) ? rows : []);
	};

	const loadReferenceData = async (typeId: number, demandeurId: string): Promise<void> => {
		if (!typeId || !demandeurId) {
			setDepots([]);
			setAffaires([]);
			setInfoTypeBesoin(null);
			return;
		}

		const [depotsRows, affairesRows, info] = await Promise.all([
			referenceService.getDepotsAutoriser(typeId, demandeurId),
			referenceService.getAffairesAutoriser(typeId),
			referenceService.getInfoTypeBesoin(typeId),
		]);

		setDepots(Array.isArray(depotsRows) ? depotsRows : []);
		setAffaires(Array.isArray(affairesRows) ? affairesRows : []);
		setInfoTypeBesoin(info);
	};

	const loadCircuit = async (typeId: number, besoinId: number, demandeurId: string): Promise<void> => {
		if (!typeId || !demandeurId) {
			setValidateurs([]);
			return;
		}
		const rows = await validationService.getCircuit(typeId, besoinId, demandeurId, 0 as Type_Validation);
		setValidateurs(Array.isArray(rows) ? rows : []);
	};

	const loadFreeFields = async (typeId: number, besoinId: number, articleId = 0): Promise<void> => {
		if (!typeId) {
			setChampsLibreBesoin([]);
			setChampsLibreArticle([]);
			return;
		}
		const [besoinFields, articleFields] = await Promise.all([
			getChampsLibreBesoin(typeId, besoinId),
			getChampsLibreArticleBesoin(typeId, articleId),
		]);
		setChampsLibreBesoin(besoinFields);
		setChampsLibreArticle(articleFields);
	};

	const resetArticleEditor = async (typeId: number, articleId = 0): Promise<void> => {
		setEditingArticle(null);
		setArticleForm({
			bA_RefArticle: "",
			bA_DesigArticle: "",
			bA_Unite: "",
			bA_Quantite: 1,
			bA_QuantiteValider: 1,
		});
		if (typeId) {
			const articleFields = await getChampsLibreArticleBesoin(typeId, articleId);
			setChampsLibreArticle(articleFields);
		} else {
			setChampsLibreArticle([]);
		}
	};

	const loadCreateMode = async (): Promise<void> => {
		setLoadingPage(true);
		try {
			setFiles([]);
			setDepots([]);
			setAffaires([]);
			setArticles([]);
			setValidateurs([]);
			setInfoTypeBesoin(null);
			setChampsLibreBesoin([]);
			setChampsLibreArticle([]);

			const numero = await besoinService.getLastNumero();
			await loadTypes();

			setFormValues({
				b_No: 0,
				b_Numero: numero?.numero ?? "",
				b_Date: formatDateForInput(new Date()),
				b_DateLivraison: formatDateForInput(new Date()),
				b_IdDemandeur: currentUserId,
				b_Demandeur: currentUserName,
				bT_Id: 0,
				b_Titre: "",
				b_Description: "",
				dE_No: "",
				cA_Num: "",
				b_DegreImportance: 1,
				b_Motif: "",
				b_NumeroOrgine: "",
				b_Etat_Besoin: Etat_Besoin.Brouillon,
				b_EtatRetour: 0,
			});
			await resetArticleEditor(0);
		} finally {
			setLoadingPage(false);
		}
	};

	const loadEditMode = async (id: number): Promise<void> => {
		setLoadingPage(true);
		try {
			setFiles([]);
			await loadTypes();

			const raw = await besoinService.getById(id);
			const besoinData = normalizeBesoin(raw);
			if (!besoinData) return;

			const typeId = asNumber(besoinData.bT_Id ?? besoinData.BT_Id);
			const demandeurId = asString(besoinData.b_IdDemandeur ?? besoinData.B_IdDemandeur ?? currentUserId);

			setFormValues({
				b_No: asNumber(besoinData.b_No ?? besoinData.B_No),
				b_Numero: asString(besoinData.b_Numero ?? besoinData.B_Numero),
				b_Date: formatDateForInput(besoinData.b_Date ?? besoinData.B_Date),
				b_DateLivraison: formatDateForInput(besoinData.b_DateLivraison ?? besoinData.B_DateLivraison),
				b_IdDemandeur: demandeurId,
				b_Demandeur: asString(besoinData.b_Demandeur ?? besoinData.B_Demandeur),
				bT_Id: typeId,
				b_Titre: asString(besoinData.b_Titre ?? besoinData.B_Titre),
				b_Description: asString(besoinData.b_Description ?? besoinData.B_Description),
				dE_No: String(besoinData.dE_No ?? besoinData.DE_No ?? ""),
				cA_Num: asString(besoinData.cA_Num ?? besoinData.CA_Num),
				b_DegreImportance: asNumber(besoinData.b_DegreImportance ?? besoinData.B_DegreImportance),
				b_Motif: asString(besoinData.b_Motif ?? besoinData.B_Motif),
				b_NumeroOrgine: asString(besoinData.b_NumeroOrgine ?? besoinData.B_NumeroOrgine),
				b_Etat_Besoin: asNumber(besoinData.b_Etat_Besoin ?? besoinData.B_Etat_Besoin),
				b_EtatRetour: asNumber(besoinData.b_EtatRetour ?? besoinData.B_EtatRetour),
			});

			await Promise.all([
				loadArticles(id),
				loadReferenceData(typeId, demandeurId),
				loadCircuit(typeId, id, demandeurId),
				loadFreeFields(typeId, id),
			]);
			await resetArticleEditor(typeId);
		} finally {
			setLoadingPage(false);
		}
	};

	useEffect(() => {
		if (currentBesoinId > 0) {
			void loadEditMode(currentBesoinId);
			return;
		}
		void loadCreateMode();
	}, [currentBesoinId, currentUserId, currentUserName]);

	const handleFormChange = (field: string, value: unknown): void => {
		setFormValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleTypeChange = async (event: SelectChangeEvent<number | string>): Promise<void> => {
		const typeId = Number(event.target.value);
		handleFormChange("bT_Id", typeId);
		handleFormChange("dE_No", "");
		handleFormChange("cA_Num", "");

		if (!typeId) {
			setDepots([]);
			setAffaires([]);
			setValidateurs([]);
			setChampsLibreBesoin([]);
			setChampsLibreArticle([]);
			return;
		}

		const demandeurId = formValues.b_IdDemandeur || currentUserId;
		await Promise.all([
			loadReferenceData(typeId, demandeurId),
			loadCircuit(typeId, currentBesoinId, demandeurId),
			loadFreeFields(typeId, currentBesoinId, asNumber(editingArticle?.bA_No ?? editingArticle?.BA_No)),
		]);
	};

	const buildBesoinPayload = (): Record<string, unknown> => ({
		B_No: currentBesoinId,
		B_Numero: formValues.b_Numero,
		B_Date: formValues.b_Date ? new Date(formValues.b_Date).toISOString() : undefined,
		B_DateLivraison: formValues.b_DateLivraison ? new Date(formValues.b_DateLivraison).toISOString() : undefined,
		B_IdDemandeur: formValues.b_IdDemandeur || currentUserId,
		B_Demandeur: formValues.b_Demandeur,
		BT_Id: formValues.bT_Id,
		B_Titre: formValues.b_Titre,
		B_Description: formValues.b_Description,
		DE_No: formValues.dE_No ? Number(formValues.dE_No) : null,
		CA_Num: formValues.cA_Num || null,
		B_DegreImportance: formValues.b_DegreImportance,
		B_Motif: formValues.b_Motif || null,
		B_Etat_Besoin: formValues.b_Etat_Besoin,
		B_EtatRetour: formValues.b_EtatRetour,
		CL_ChampLibre: JSON.stringify(champsLibreBesoin),
	});

	const validateBesoinForm = (): string | null => {
		if (!formValues.b_Numero.trim()) return "Numéro du besoin vide";
		if (!formValues.bT_Id) return "Type de besoin est obligatoire";
		if (!formValues.b_Titre.trim()) return "Titre est obligatoire";
		if (!formValues.b_Description.trim()) return "Description est obligatoire";
		if (asBoolean((infoTypeBesoin as Record<string, unknown> | null)?.BT_DepotObligatoire) && !formValues.dE_No) {
			return "Dépôt est obligatoire";
		}
		if (asBoolean((infoTypeBesoin as Record<string, unknown> | null)?.BT_AffaireObligatoire) && !formValues.cA_Num) {
			return "Affaire est obligatoire";
		}
		return null;
	};

	const handleSaveBesoin = async (): Promise<number | null> => {
		const validationMessage = validateBesoinForm();
		if (validationMessage) {
			toast.error(validationMessage);
			return null;
		}

		setSavingBesoin(true);
		try {
			const result = await besoinService.save(buildBesoinPayload(), files);
			const savedId = asNumber((result as Record<string, unknown>)?.b_No);
			setCurrentBesoinId(savedId);
			toast.success("Demande enregistrée avec succès.");
			return savedId;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.");
			return null;
		} finally {
			setSavingBesoin(false);
		}
	};

	const handleConfirmer = async (): Promise<void> => {
		const savedId = currentBesoinId || (await handleSaveBesoin());
		if (!savedId) return;
		try {
			await besoinService.confirmer(savedId);
			toast.success("Demande confirmée.");
			await loadEditMode(savedId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de la confirmation.");
		}
	};

	const handleArticleFieldChange = (field: keyof typeof articleForm, value: unknown): void => {
		setArticleForm((prev) => ({
			...prev,
			[field]: field === "bA_Quantite" || field === "bA_QuantiteValider" ? asNumber(value) : asString(value),
		}));
	};

	const handleSelectArticleRow = async (row: IBesoinArticle): Promise<void> => {
		setEditingArticle(row);
		setArticleForm({
			bA_RefArticle: asString(row.bA_RefArticle ?? row.BA_RefArticle),
			bA_DesigArticle: asString(row.bA_DesigArticle ?? row.BA_DesigArticle),
			bA_Unite: asString(row.bA_Unite ?? row.BA_Unite),
			bA_Quantite: asNumber(row.bA_Quantite ?? row.BA_Quantite),
			bA_QuantiteValider:
				asNumber(row.bA_QuantiteValider ?? row.BA_QuantiteValider) || asNumber(row.bA_Quantite ?? row.BA_Quantite),
		});

		const typeId = asNumber(formValues.bT_Id);
		const articleId = asNumber(row.bA_No ?? row.BA_No);
		if (typeId) {
			const articleFields = await getChampsLibreArticleBesoin(typeId, articleId);
			setChampsLibreArticle(articleFields);
		}
	};

	const handleSaveArticle = async (): Promise<void> => {
		if (!currentBesoinId) {
			toast.warning("Enregistrez d'abord la demande avant d'ajouter des articles.");
			return;
		}
		if (!articleForm.bA_RefArticle.trim()) {
			toast.error("Référence article obligatoire");
			return;
		}
		if (!articleForm.bA_DesigArticle.trim()) {
			toast.error("Désignation article obligatoire");
			return;
		}
		if (!articleForm.bA_Quantite || articleForm.bA_Quantite <= 0) {
			toast.error("Quantité invalide");
			return;
		}

		setSavingArticle(true);
		try {
			await articleBesoinService.save({
				...editingArticle,
				BA_No: asNumber(editingArticle?.bA_No ?? editingArticle?.BA_No),
				B_BesoinId: currentBesoinId,
				BA_RefArticle: articleForm.bA_RefArticle,
				BA_DesigArticle: articleForm.bA_DesigArticle,
				BA_Unite: articleForm.bA_Unite,
				BA_Quantite: articleForm.bA_Quantite,
				BA_QuantiteValider: articleForm.bA_QuantiteValider || articleForm.bA_Quantite,
				CL_ChampLibre: JSON.stringify(champsLibreArticle),
			});
			toast.success("Article enregistré.");
			await loadArticles(currentBesoinId);
			await resetArticleEditor(asNumber(formValues.bT_Id));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'article.");
		} finally {
			setSavingArticle(false);
		}
	};

	const handleDeleteArticle = async (articleNo: number): Promise<void> => {
		try {
			await articleBesoinService.delete(articleNo);
			toast.success("Article supprimé.");
			if (currentBesoinId) await loadArticles(currentBesoinId);
			await resetArticleEditor(asNumber(formValues.bT_Id));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression.");
		}
	};

	const handleArticleDivers = async (): Promise<void> => {
		if (!formValues.bT_Id) {
			toast.warning("Choisissez d'abord un type de besoin.");
			return;
		}
		try {
			const response = (await referenceService.getArticleDivers(asNumber(formValues.bT_Id))) as Record<string, unknown>;
			setArticleForm({
				bA_RefArticle: asString(response.AR_Ref),
				bA_DesigArticle: asString(response.AR_Design),
				bA_Unite: asString(response.BA_Unite),
				bA_Quantite: asNumber(response.BA_Quantite) || 1,
				bA_QuantiteValider: asNumber(response.BA_Quantite) || 1,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Impossible de charger l'article divers.");
		}
	};

	const loadArticlePickerRows = useCallback(
		async (pageZeroBased: number): Promise<void> => {
			setArticlePickerLoading(true);
			try {
				const params = new URLSearchParams();
				params.set("pageIndex", String(pageZeroBased + 1));
				params.set("pageSize", String(articlePickerPageSize));
				params.set("actionView", "Choix");
				if (formValues.dE_No) params.set("dE_No", String(formValues.dE_No));
				if (articlePickerSearchRef.trim()) params.set("aR_Ref", articlePickerSearchRef.trim());
				if (articlePickerSearchDesign.trim()) params.set("aR_Design", articlePickerSearchDesign.trim());

				const response = await apiClient.get<unknown>(`/api/article?${params.toString()}`);
				const payload = response.data as Record<string, unknown> | IArticle[] | null;
				let rows: IArticle[] = [];
				let total = 0;

				if (Array.isArray(payload)) {
					rows = payload as IArticle[];
					total = rows.length;
				} else if (payload && typeof payload === "object") {
					const inner = payload.data as Record<string, unknown> | IArticle[] | undefined;
					if (Array.isArray(inner)) {
						rows = inner as IArticle[];
						total = asNumber(payload.totalCount ?? rows.length);
					} else if (inner && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).data)) {
						const nested = inner as Record<string, unknown>;
						rows = nested.data as IArticle[];
						total = asNumber(nested.itemsCount ?? nested.totalCount ?? rows.length);
					}
				}

				setArticlePickerRows(rows);
				setArticlePickerTotal(total);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Impossible de charger le catalogue articles.");
				setArticlePickerRows([]);
				setArticlePickerTotal(0);
			} finally {
				setArticlePickerLoading(false);
			}
		},
		[articlePickerPageSize, articlePickerSearchRef, articlePickerSearchDesign, formValues.dE_No],
	);

	const openArticlePicker = (): void => {
		if (!canEditArticles) return;
		if (asBoolean((infoTypeBesoin as Record<string, unknown> | null)?.BT_DepotObligatoire) && !formValues.dE_No) {
			toast.warning("Choisissez un dépôt avant de sélectionner un article.");
			return;
		}
		setArticlePickerPage(0);
		setArticlePickerOpen(true);
	};

	useEffect(() => {
		if (!articlePickerOpen) return;
		void loadArticlePickerRows(articlePickerPage);
	}, [articlePickerOpen, articlePickerPage, articlePickerTick, loadArticlePickerRows]);

	const handleArticlePickerApplyFilters = (): void => {
		setArticlePickerPage(0);
		setArticlePickerTick((t) => t + 1);
	};

	const applyArticleFromPicker = async (row: IArticle): Promise<void> => {
		const { ref, design, unite } = extractArticleCatalogFields(row);
		if (!ref) {
			toast.error("Référence article invalide.");
			return;
		}
		setArticleForm((prev) => ({
			...prev,
			bA_RefArticle: ref,
			bA_DesigArticle: design,
			bA_Unite: unite,
			bA_Quantite: prev.bA_Quantite || 1,
			bA_QuantiteValider: prev.bA_QuantiteValider || prev.bA_Quantite || 1,
		}));
		const typeId = asNumber(formValues.bT_Id);
		if (typeId) {
			try {
				const fields = await getChampsLibreArticleBesoin(typeId, 0);
				setChampsLibreArticle(fields);
			} catch {
				/* champs libres optionnels */
			}
		}
		setArticlePickerOpen(false);
		toast.success("Article sélectionné.");
	};

	const updateChampLibreBesoin = (index: number, value: string): void => {
		setChampsLibreBesoin((prev) => prev.map((champ, idx) => (idx === index ? mapChampValue(champ, value) : champ)));
	};

	const updateChampLibreArticle = (index: number, value: string): void => {
		setChampsLibreArticle((prev) => prev.map((champ, idx) => (idx === index ? mapChampValue(champ, value) : champ)));
	};

	if (loadingPage) {
		return (
			<div className="flex min-h-[320px] items-center justify-center p-6">
				<CircularProgress />
			</div>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
			<Stack
				direction="row"
				spacing={2}
				sx={{
					justifyContent: "space-between",
					alignItems: "center",
					mb: 2,
					flexWrap: "wrap",
					gap: 1,
				}}
			>
				<Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
					<Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>
						Retour
					</Button>
					<Button
						variant="contained"
						size="small"
						onClick={() => void handleSaveBesoin()}
						disabled={!canEditBesoin || savingBesoin}
					>
						{savingBesoin ? "Enregistrement..." : "Enregistrer"}
					</Button>
					<Button
						variant="contained"
						size="small"
						color="success"
						startIcon={<CheckCircleIcon />}
						onClick={() => void handleConfirmer()}
						disabled={!canConfirm}
					>
						Confirmer
					</Button>
					<Button
						variant="outlined"
						size="small"
						startIcon={<RefreshIcon />}
						onClick={() => void (currentBesoinId ? loadEditMode(currentBesoinId) : loadCreateMode())}
					>
						Actualiser
					</Button>
					<Button variant="outlined" size="small" startIcon={<LocalPrintshopIcon />} disabled={currentBesoinId === 0}>
						Imprimer
					</Button>
				</Stack>
				<Chip
					size="small"
					color={
						currentEtat === Etat_Besoin.Refuser
							? "error"
							: currentEtat === Etat_Besoin.Brouillon
								? "default"
								: "primary"
					}
					label={ETAT_BESOIN_LABELS[currentEtat] ?? `Etat ${currentEtat}`}
				/>
			</Stack>

			<Stack spacing={2}>
				<Accordion defaultExpanded sx={accordionBlockSx}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Informations Générales
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Numéro"
									value={formValues.b_Numero}
									slotProps={{ input: { readOnly: true } }}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Date"
									type="date"
									value={formValues.b_Date}
									slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Demandeur"
									value={formValues.b_Demandeur}
									slotProps={{ input: { readOnly: true } }}
								/>
							</Grid>
							{formValues.b_NumeroOrgine && (
								<Grid size={{ xs: 12, md: 4 }}>
									<TextField
										{...besoinTextFieldDefaults}
										label="Numéro d'origine"
										value={formValues.b_NumeroOrgine}
										slotProps={{ input: { readOnly: true } }}
									/>
								</Grid>
							)}
							{formValues.b_Motif && (
								<Grid size={{ xs: 12, md: 8 }}>
									<TextField
										{...besoinTextFieldDefaults}
										multiline
										minRows={3}
										label="Motif"
										value={formValues.b_Motif}
										slotProps={{ input: { readOnly: true } }}
									/>
								</Grid>
							)}
						</Grid>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={accordionBlockSx}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Détails de la demande
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12, md: 4 }}>
								<InputLabel shrink required sx={besoinDropdownLabelSx}>
									Type de besoin
								</InputLabel>
								<Select
									fullWidth
									size="small"
									variant="outlined"
									value={formValues.bT_Id}
									onChange={handleTypeChange}
									disabled={!canEditType}
									sx={besoinSelectSx}
									MenuProps={besoinSelectMenuProps}
								>
									<MenuItem value={0}>Choisir</MenuItem>
									{typesBesoin.map((type) => {
										const row = type as unknown as Record<string, unknown>;
										const typeId = asNumber(row.BT_Id ?? row.bT_Id);
										const label = asString(row.BT_Intitule ?? row.bT_Intitule);
										return (
											<MenuItem key={typeId} value={typeId}>
												{label || `Type ${typeId}`}
											</MenuItem>
										);
									})}
								</Select>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									{...besoinTextFieldDefaults}
									required
									label="Titre"
									value={formValues.b_Titre}
									onChange={(event) => handleFormChange("b_Titre", event.target.value)}
									disabled={!canEditBesoin}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									{...besoinTextFieldDefaults}
									required
									label="Date de livraison"
									type="date"
									value={formValues.b_DateLivraison}
									onChange={(event) => handleFormChange("b_DateLivraison", event.target.value)}
									slotProps={{ inputLabel: { shrink: true } }}
									disabled={!canEditBesoin}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<InputLabel
									shrink
									required={asBoolean((infoTypeBesoin as Record<string, unknown> | null)?.BT_DepotObligatoire)}
									sx={besoinDropdownLabelSx}
								>
									Dépôt
								</InputLabel>
								<Select
									fullWidth
									size="small"
									variant="outlined"
									value={formValues.dE_No}
									onChange={(event) => handleFormChange("dE_No", event.target.value)}
									disabled={!canEditBesoin}
									sx={besoinSelectSx}
									MenuProps={besoinSelectMenuProps}
								>
									<MenuItem value="">Choisir</MenuItem>
									{depots.map((depot) => {
										const depotNo = String(
											(depot as Record<string, unknown>).DE_No ?? (depot as Record<string, unknown>).dE_No ?? "",
										);
										const label = asString(
											(depot as Record<string, unknown>).DE_Intitule ?? (depot as Record<string, unknown>).dE_Intitule,
										);
										return (
											<MenuItem key={depotNo} value={depotNo}>
												{label}
											</MenuItem>
										);
									})}
								</Select>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<InputLabel
									shrink
									required={asBoolean((infoTypeBesoin as Record<string, unknown> | null)?.BT_AffaireObligatoire)}
									sx={besoinDropdownLabelSx}
								>
									Affaire
								</InputLabel>
								<Select
									fullWidth
									size="small"
									variant="outlined"
									value={formValues.cA_Num}
									onChange={(event) => handleFormChange("cA_Num", event.target.value)}
									disabled={!canEditBesoin}
									sx={besoinSelectSx}
									MenuProps={besoinSelectMenuProps}
								>
									<MenuItem value="">Choisir</MenuItem>
									{affaires.map((affaire) => {
										const code = asString(
											(affaire as Record<string, unknown>).CA_Num ?? (affaire as Record<string, unknown>).cA_Num,
										);
										const label = asString(
											(affaire as Record<string, unknown>).CA_Intitule ??
												(affaire as Record<string, unknown>).cA_Intitule,
										);
										return (
											<MenuItem key={code} value={code}>
												{label}
											</MenuItem>
										);
									})}
								</Select>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<Box sx={{ px: 1 }}>
									<Typography gutterBottom>Degré d'importance</Typography>
									<Slider
										min={1}
										max={5}
										step={1}
										value={formValues.b_DegreImportance}
										onChange={(_, value) => handleFormChange("b_DegreImportance", value)}
										disabled={!degreeEnabled}
										valueLabelDisplay="auto"
									/>
									<Typography variant="body2" color="text.secondary">
										{degreeImportanceLabels[formValues.b_DegreImportance] ?? formValues.b_DegreImportance}
									</Typography>
								</Box>
							</Grid>
							<Grid size={12}>
								<TextField
									{...besoinTextFieldDefaults}
									required
									multiline
									minRows={4}
									label="Description"
									value={formValues.b_Description}
									onChange={(event) => handleFormChange("b_Description", event.target.value)}
									disabled={!canEditBesoin}
								/>
							</Grid>
							{champsLibreBesoin.map((champ, index) => (
								<Grid key={getChampKey(champ, index)} size={{ xs: 12, md: 4 }}>
									<TextField
										{...besoinTextFieldDefaults}
										label={getChampKey(champ, index)}
										value={asString(champ.CL_ChampValue)}
										onChange={(event) => updateChampLibreBesoin(index, event.target.value)}
										disabled={!canEditBesoin}
									/>
								</Grid>
							))}
						</Grid>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={accordionBlockSx}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Articles demandés
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
							<Button
								variant="outlined"
								startIcon={<AddIcon />}
								onClick={() => void handleArticleDivers()}
								disabled={!canEditArticles}
							>
								Article divers
							</Button>
							<Button
								variant="outlined"
								onClick={() => void resetArticleEditor(asNumber(formValues.bT_Id))}
								disabled={!canEditArticles}
							>
								Nouveau
							</Button>
							<Button
								variant="contained"
								onClick={() => void handleSaveArticle()}
								disabled={!canEditArticles || savingArticle}
							>
								{editingArticle ? "Mettre à jour" : "Enregistrer"}
							</Button>
						</Stack>

						<Grid container spacing={2} sx={{ mb: 2 }}>
							<Grid size={{ xs: 12, md: 3 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Référence"
									value={articleForm.bA_RefArticle}
									onChange={(event) => handleArticleFieldChange("bA_RefArticle", event.target.value)}
									disabled={!canEditArticles}
									slotProps={{
										input: {
											endAdornment: (
												<InputAdornment position="end">
													<IconButton
														edge="end"
														aria-label="Ouvrir le catalogue articles"
														onClick={openArticlePicker}
														disabled={!canEditArticles}
														size="small"
													>
														<SearchIcon fontSize="small" />
													</IconButton>
												</InputAdornment>
											),
										},
									}}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 5 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Désignation"
									value={articleForm.bA_DesigArticle}
									onChange={(event) => handleArticleFieldChange("bA_DesigArticle", event.target.value)}
									disabled={!canEditArticles}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 2 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Unité"
									value={articleForm.bA_Unite}
									onChange={(event) => handleArticleFieldChange("bA_Unite", event.target.value)}
									disabled={!canEditArticles}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 2 }}>
								<TextField
									{...besoinTextFieldDefaults}
									label="Quantité"
									type="number"
									value={articleForm.bA_Quantite}
									onChange={(event) => handleArticleFieldChange("bA_Quantite", event.target.value)}
									disabled={!canEditArticles}
								/>
							</Grid>
							{champsLibreArticle.map((champ, index) => (
								<Grid key={getChampKey(champ, index)} size={{ xs: 12, md: 3 }}>
									<TextField
										{...besoinTextFieldDefaults}
										label={getChampKey(champ, index)}
										value={asString(champ.CL_ChampValue)}
										onChange={(event) => updateChampLibreArticle(index, event.target.value)}
										disabled={!canEditArticles}
									/>
								</Grid>
							))}
						</Grid>

						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Référence</TableCell>
										<TableCell>Désignation</TableCell>
										<TableCell>Unité</TableCell>
										<TableCell align="right">Quantité</TableCell>
										<TableCell align="right">Qté validée</TableCell>
										<TableCell>Actions</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{articles.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center">
												Aucun article
											</TableCell>
										</TableRow>
									)}
									{articles.map((row) => {
										const rowId = asNumber(row.bA_No ?? row.BA_No);
										return (
											<TableRow
												key={rowId}
												hover
												selected={rowId === asNumber(editingArticle?.bA_No ?? editingArticle?.BA_No)}
											>
												<TableCell>{asString(row.bA_RefArticle ?? row.BA_RefArticle)}</TableCell>
												<TableCell>{asString(row.bA_DesigArticle ?? row.BA_DesigArticle)}</TableCell>
												<TableCell>{asString(row.bA_Unite ?? row.BA_Unite)}</TableCell>
												<TableCell align="right">{asNumber(row.bA_Quantite ?? row.BA_Quantite)}</TableCell>
												<TableCell align="right">
													{asNumber(row.bA_QuantiteValider ?? row.BA_QuantiteValider)}
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={1}>
														<Button
															size="small"
															variant="outlined"
															onClick={() => void handleSelectArticleRow(row)}
															disabled={!canEditArticles}
														>
															Modifier
														</Button>
														<Button
															size="small"
															color="error"
															variant="outlined"
															startIcon={<DeleteIcon />}
															onClick={() => void handleDeleteArticle(rowId)}
															disabled={!canEditArticles}
														>
															Supprimer
														</Button>
													</Stack>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={accordionBlockSx}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Attachements
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
							<Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={!canEditBesoin}>
								Ajouter des fichiers
								<input
									hidden
									multiple
									type="file"
									onChange={(event) => {
										const selected = Array.from(event.target.files ?? []);
										if (selected.length > 0) {
											setFiles((prev) => [...prev, ...selected]);
										}
									}}
								/>
							</Button>
							<Typography variant="body2" color="text.secondary">
								{files.length} fichier(s) sélectionné(s)
							</Typography>
						</Stack>
						<Stack spacing={1} sx={{ mt: 2 }}>
							{files.map((file, index) => (
								<MuiCard key={`${file.name}-${index}`} variant="outlined">
									<MuiCardContent sx={{ py: 1.5 }}>
										<Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
											<Typography variant="body2">{file.name}</Typography>
											<Button
												size="small"
												color="error"
												onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== index))}
												disabled={!canEditBesoin}
											>
												Retirer
											</Button>
										</Stack>
									</MuiCardContent>
								</MuiCard>
							))}
						</Stack>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={accordionBlockSx}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Circuit de validation
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", columnGap: 1, rowGap: 1 }}>
							<Chip label="Création" color="primary" variant="filled" />
							{validateurs.map((item, index) => {
								const status = asNumber(item.v_Status ?? item.V_Status);
								const label =
									asString(item.uS_UserIntitule ?? item.US_UserIntitule) ||
									asString(item.v_ValStatus ?? item.V_ValStatus) ||
									`Validateur ${index + 1}`;
								return (
									<Chip
										key={`${label}-${index}`}
										label={`${label} • ${STATUT_LABELS[status] ?? `Statut ${status}`}`}
										color={status === 3 ? "success" : status === 1 ? "error" : "default"}
										variant={status === 3 ? "filled" : "outlined"}
									/>
								);
							})}
						</Stack>
						<Divider sx={{ my: 2 }} />
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Niveau</TableCell>
										<TableCell>Validateur</TableCell>
										<TableCell>Rôle</TableCell>
										<TableCell>Statut</TableCell>
										<TableCell>Date validation</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{validateurs.length === 0 && (
										<TableRow>
											<TableCell colSpan={5} align="center">
												Aucun validateur
											</TableCell>
										</TableRow>
									)}
									{validateurs.map((row, index) => (
										<TableRow key={`${asString(row.uS_Id ?? row.US_Id)}-${index}`}>
											<TableCell>{asNumber(row.v_Niveau ?? row.V_Niveau)}</TableCell>
											<TableCell>{asString(row.uS_UserIntitule ?? row.US_UserIntitule)}</TableCell>
											<TableCell>{asString(row.rO_Intitule ?? row.RO_Intitule)}</TableCell>
											<TableCell>
												<Chip
													size="small"
													label={
														asString(row.v_ValStatus ?? row.V_ValStatus) ||
														STATUT_LABELS[asNumber(row.v_Status ?? row.V_Status)]
													}
													color={asNumber(row.v_Status ?? row.V_Status) === 3 ? "success" : "default"}
													variant={asNumber(row.v_Status ?? row.V_Status) === 3 ? "filled" : "outlined"}
												/>
											</TableCell>
											<TableCell>
												{row.v_ValidationDate || row.V_ValidationDate
													? new Date(String(row.v_ValidationDate ?? row.V_ValidationDate)).toLocaleDateString("fr-FR")
													: "-"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</AccordionDetails>
				</Accordion>
			</Stack>

			{!canEditBesoin && (
				<Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
					Cette demande n'est plus modifiable dans son état actuel.
				</Alert>
			)}

			<Dialog open={articlePickerOpen} onClose={() => setArticlePickerOpen(false)} maxWidth="lg" fullWidth>
				<DialogTitle>Choisir un article</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Filtre catalogue (équivalent vue Article en mode choix). Le dépôt sélectionné sur la demande est transmis en{" "}
						<code>dE_No</code> lorsqu’il est renseigné.
					</Typography>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						sx={{ mb: 2, alignItems: { xs: "stretch", sm: "center" } }}
					>
						<TextField
							{...besoinTextFieldDefaults}
							label="Référence"
							value={articlePickerSearchRef}
							onChange={(e) => setArticlePickerSearchRef(e.target.value)}
							sx={[besoinTextFieldDefaults.sx, { minWidth: 160, flex: 1 }]}
						/>
						<TextField
							{...besoinTextFieldDefaults}
							label="Désignation"
							value={articlePickerSearchDesign}
							onChange={(e) => setArticlePickerSearchDesign(e.target.value)}
							sx={[besoinTextFieldDefaults.sx, { minWidth: 200, flex: 2 }]}
						/>
						<Button variant="contained" onClick={() => void handleArticlePickerApplyFilters()}>
							Rechercher
						</Button>
					</Stack>
					{articlePickerLoading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<TableCell>Référence</TableCell>
											<TableCell>Désignation</TableCell>
											<TableCell>Famille</TableCell>
											<TableCell align="right" width={120}>
												Action
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{articlePickerRows.length === 0 && (
											<TableRow>
												<TableCell colSpan={4} align="center">
													Aucun article — vérifiez le dépôt, les filtres ou l’API <code>/api/article</code>.
												</TableCell>
											</TableRow>
										)}
										{articlePickerRows.map((row) => {
											const { ref, design } = extractArticleCatalogFields(row);
											const fam = asString(
												(row as Record<string, unknown>).fA_Intitule ??
													(row as Record<string, unknown>).FA_Intitule ??
													"",
											);
											return (
												<TableRow
													key={`${ref}-${(row as IArticle).cbMarq}`}
													hover
													sx={{ cursor: "pointer" }}
													onDoubleClick={() => void applyArticleFromPicker(row)}
												>
													<TableCell>{ref}</TableCell>
													<TableCell>{design}</TableCell>
													<TableCell>{fam}</TableCell>
													<TableCell align="right">
														<Button size="small" variant="contained" onClick={() => void applyArticleFromPicker(row)}>
															Choisir
														</Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>
							<TablePagination
								component="div"
								count={articlePickerTotal}
								page={articlePickerPage}
								onPageChange={(_, newPage) => setArticlePickerPage(newPage)}
								rowsPerPage={articlePickerPageSize}
								onRowsPerPageChange={(e) => {
									setArticlePickerPageSize(Number.parseInt(e.target.value, 10));
									setArticlePickerPage(0);
								}}
								rowsPerPageOptions={[5, 10, 25, 50]}
								labelRowsPerPage="Lignes"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `+${to}`}`}
							/>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setArticlePickerOpen(false)}>Fermer</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
