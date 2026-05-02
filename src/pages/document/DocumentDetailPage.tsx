import {
	Add as AddIcon,
	AttachFile as AttachFileIcon,
	Check as CheckIcon,
	Close as CloseIcon,
	CloudUpload as CloudUploadIcon,
	ContentCopy as CopyIcon,
	Delete as DeleteIcon,
	Info as InfoIcon,
	OpenInNew as OpenInNewIcon,
	Print as PrintIcon,
	Save as SaveIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import apiClient from "@/api/apiClient";
import { verifierDemandeCloturer } from "@/services/besoinservice";
import {
	addOrUpdateLigneDocument,
	annulerDocumentSage,
	changerEtatDocument,
	comptabiliserDocument,
	deleteLigneDocument,
	getDetailsDocument,
	getLignesDocument,
	getTaxesLignes,
	getTotauxDocument,
	saveDetailsDocument,
	transformerBonCommande,
	validerDocumentSage,
} from "@/services/documentService";
import type { IArticle } from "@/types/article";
import { Type_Validation_Document, TypeSage } from "@/types/besoin";

// Helpers
const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => (typeof value === "string" ? value : String(value ?? ""));
const asNumber = (value: unknown): number => {
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number(value);
		return Number.isNaN(n) ? 0 : n;
	}
	return 0;
};
const asBool = (value: unknown): boolean => value === true || value === "true" || value === 1;
const getValue = (source: Record<string, unknown>, lower: string, upper: string = lower): unknown =>
	source[lower] ?? source[upper];
const formatMoney = (value: unknown): string => {
	const amount = asNumber(value);
	return amount === 0 ? "" : amount.toFixed(2);
};
const toDateInputValue = (value: unknown, fallback = dayjs().format("YYYY-MM-DD")): string => {
	const raw = asString(value);
	if (!raw) return fallback;
	const parsed = dayjs(raw);
	if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
	const french = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
	return french ? `${french[3]}-${french[2]}-${french[1]}` : fallback;
};
const stringifyChampsLibre = (value: Record<string, unknown> | unknown[]): string => {
	if (Array.isArray(value)) return JSON.stringify(value);
	const entries = Object.entries(value).filter(([, champValue]) => champValue !== undefined && champValue !== null);
	return JSON.stringify(entries.length ? value : []);
};
const extractArticleCatalogFields = (row: IArticle): { ref: string; design: string; prixAchat: number } => {
	const record = row as Record<string, unknown>;
	return {
		ref: asString(row.aR_Ref ?? record.AR_Ref ?? record.aR_Ref),
		design: asString(row.aR_Design ?? record.AR_Design ?? record.aR_Design),
		prixAchat: asNumber(row.aR_PrixAch ?? record.AR_PrixAch ?? record.aR_PrixAch),
	};
};

const DETAIL_STYLES = `
  .document-detail-page {
    background: #f4f6f9;
    min-height: 100%;
    padding: 8px 14px 20px;
    color: #1f2933;
  }
  .document-breadcrumb {
    font-size: 12px;
    color: #005b95;
    margin-bottom: 8px;
    font-weight: 600;
  }
  .document-shell {
    background: #fff;
    border: 1px solid #dfe5ea;
    border-left: 3px solid #0b9bd8;
    border-radius: 8px;
    box-shadow: 0 2px 7px rgba(15, 23, 42, 0.07);
  }
  .document-panel {
    padding: 14px 14px 18px;
  }
  .document-toolbar {
    justify-content: flex-end;
    padding-bottom: 8px;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #0b8fd3;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .section-title::after {
    content: "";
    height: 2px;
    background: #0b9bd8;
    flex: 1;
  }
  .lines-card {
    margin-top: 8px;
    overflow: hidden;
  }
  .line-form {
    padding: 16px 16px 8px;
  }
  .lines-actions {
    justify-content: flex-end;
    padding: 0 16px 4px;
  }
  .tax-total-row {
    display: grid;
    grid-template-columns: minmax(260px, 360px) 1fr minmax(230px, 280px);
    gap: 16px;
    align-items: start;
    padding: 16px;
  }
  .totals-box {
    border: 1px solid #e5e7eb;
  }
  .total-row {
    display: grid;
    grid-template-columns: 1fr 110px;
    min-height: 31px;
    border-bottom: 1px solid #e5e7eb;
  }
  .total-row:last-child {
    border-bottom: 0;
  }
  .total-label {
    background: #f8fafc;
    padding: 7px 8px;
    font-size: 12px;
  }
  .total-value {
    padding: 7px 8px;
    text-align: right;
    font-weight: 700;
    font-size: 12px;
  }
  .attachments-dropzone {
    min-height: 313px;
    border: 1px solid #b9c0c8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
    color: #344054;
    background: #fff;
  }
  @media (max-width: 1100px) {
    .tax-total-row {
      grid-template-columns: 1fr;
    }
    .document-toolbar,
    .lines-actions {
      justify-content: flex-start;
    }
  }
`;

interface DocumentLine {
	lP_No: number;
	aR_Ref: string;
	aR_Design: string;
	cA_Intitule_Affaire: string;
	lP_DateLivraison: string;
	lP_PrixUnitaire: number;
	lP_PUTTC: number;
	lP_QteMvt: number;
	lP_Remise: string;
	lP_TauxTVA: number;
	lP_MontantHT: number;
	lP_MontantTTC: number;
	lP_NbAttachement: number;
	bA_No: number;
}

interface TaxLine {
	lt_BaseTaxe: number;
	lt_Taux: number;
	lt_MontantTaxe: number;
}

export default function DocumentDetailPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const epNumero = searchParams.get("epNumero") || "";
	const tpNo = Number(searchParams.get("tpNo")) || TypeSage.Demande_Achat;

	// Determine document type based on tpNo value
	// Backend may return different tP_No values (e.g., 10 for Demande_Achat, 20 for BC_Achat)
	// We use the route or a simple heuristic: if tpNo matches BC_Achat variants, it's a BC
	const isBC = tpNo === TypeSage.BC_Achat || tpNo === TypeSage.BC;

	// Loading states
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isTotallyClotured, setIsTotallyClotured] = useState(false);

	// Document header state
	const [document, setDocument] = useState<Record<string, unknown>>({});
	const [champsLibreEntete, setChampsLibreEntete] = useState<Record<string, unknown>>({});

	// Lines state
	const [lines, setLines] = useState<DocumentLine[]>([]);
	const [selectedLineId, setSelectedLineId] = useState<number>(0);
	const [champsLibreLigne, setChampsLibreLigne] = useState<Record<string, unknown>>({});

	// Taxes state
	const [taxes, setTaxes] = useState<TaxLine[]>([]);

	// Totals state (loaded with document)
	const [totaux, setTotaux] = useState<Record<string, unknown>>({});
	const [linePageSize, setLinePageSize] = useState(10);

	// Form state for new/edit line
	const [lineForm, setLineForm] = useState({
		lP_No: 0,
		ar_Ref: "",
		ar_Design: "",
		ca_Num_Ligne: "",
		lp_DateLivraison: dayjs().format("YYYY-MM-DD"),
		lp_QteMvt: 1,
		lp_ValeurRemise: 0,
		lp_TypeRemise: 1, // 1 = %, 0 = Montant
		lp_PrixUnitaire: 0,
	});

	// Article picker modal
	const [articlePickerOpen, setArticlePickerOpen] = useState(false);
	const [articlePickerLoading, setArticlePickerLoading] = useState(false);
	const [articlePickerRows, setArticlePickerRows] = useState<IArticle[]>([]);
	const [articlePickerTotal, setArticlePickerTotal] = useState(0);
	const [articlePickerPage, setArticlePickerPage] = useState(0);
	const [articlePickerPageSize, setArticlePickerPageSize] = useState(10);
	const [articlePickerSearchRef, setArticlePickerSearchRef] = useState("");
	const [articlePickerSearchDesign, setArticlePickerSearchDesign] = useState("");
	const [articlePickerTick, setArticlePickerTick] = useState(0);

	// Active tab
	const [activeTab, setActiveTab] = useState(0);

	// Permissions (would come from auth context)
	const permissions = useMemo(
		() => ({
			ajouter: true,
			modifier: true,
			supprimer: true,
			cloturer: true,
			decloturer: true,
			validerSage: true,
			comptabiliser: true,
			transformer: true,
			annuler: true,
			imprimer: true,
			ajouterLD: true,
			modifierLD: true,
			supprimerLD: true,
			consulterAttach: true,
		}),
		[],
	);

	// Derived values
	const isNew = !epNumero;
	const epValiderAERP = asNumber(getValue(document, "eP_ValiderAERP", "EP_ValiderAERP"));
	const isCloturer = epValiderAERP === Type_Validation_Document.Cloturer;
	const isValiderSage = epValiderAERP === Type_Validation_Document.Valider_Sage;
	const isAnnuler = epValiderAERP === Type_Validation_Document.Annuler;
	const docNumero = asString(getValue(document, "eP_Numero", "EP_Numero"));
	const bNo = asNumber(getValue(document, "b_No", "B_No"));
	const selectedLines = lines.slice(0, linePageSize);

	useEffect(() => {
		const checkIfTotallyClotured = async () => {
			if (bNo && !isBC) {
				try {
					const result = await verifierDemandeCloturer(bNo, tpNo);
					setIsTotallyClotured(!!result);
				} catch (error) {
					console.error("Error checking if totally clotured:", error);
					setIsTotallyClotured(false);
				}
			} else {
				setIsTotallyClotured(false);
			}
		};
		void checkIfTotallyClotured();
	}, [bNo, tpNo, isBC]);

	// Load document data
	const loadDocument = useCallback(async () => {
		if (isNew) {
			setDocument({
				eP_Date: dayjs().format("YYYY-MM-DD"),
				eP_DateLivraison: dayjs().add(7, "day").format("YYYY-MM-DD"),
				tP_No: tpNo,
			});
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const res = await getDetailsDocument(epNumero, tpNo);
			const resRecord = asRecord(res);

			// API returns either:
			// 1. { isValid: true, document: {...}, champsLibres: {...} } (wrapped)
			// 2. Flat document object directly (unwrapped)
			if (asBool(resRecord.isValid) && resRecord.document) {
				setDocument(asRecord(resRecord.document));
				setChampsLibreEntete(asRecord(resRecord.champsLibres));
			} else if (resRecord.eP_Numero || resRecord.EP_Numero) {
				// Unwrapped response - the document is the response itself
				setDocument(resRecord);
				setChampsLibreEntete({});
			} else {
				toast.error(asString(resRecord.Message) || "Erreur de chargement");
				setLoading(false);
				return;
			}

			// Load related data
			try {
				const docData = asBool(resRecord.isValid) && resRecord.document ? asRecord(resRecord.document) : resRecord;
				const linesRes = await getLignesDocument({
					eP_Numero: epNumero,
					tP_No: tpNo,
					bNo: asNumber(getValue(docData, "b_No", "B_No")),
					pageIndex: 1,
					pageSize: 1000,
				});
				const linesRecord = asRecord(linesRes);
				// Handle both { data: [...] } and direct array responses
				const linesArray = Array.isArray(linesRes) ? linesRes : Array.isArray(linesRecord.data) ? linesRecord.data : [];
				setLines(linesArray as DocumentLine[]);

				const taxesRes = await getTaxesLignes(epNumero, tpNo);
				const taxesRecord = asRecord(taxesRes);
				const taxesArray = Array.isArray(taxesRes) ? taxesRes : Array.isArray(taxesRecord.data) ? taxesRecord.data : [];
				setTaxes(taxesArray as TaxLine[]);

				const totauxRes = await getTotauxDocument(epNumero, tpNo);
				setTotaux(asRecord(totauxRes));
			} catch (error) {}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur de chargement");
		} finally {
			setLoading(false);
		}
	}, [epNumero, tpNo, isNew]);

	// Load lines
	const loadLines = useCallback(async () => {
		if (isNew) return;
		try {
			const res = await getLignesDocument({
				eP_Numero: epNumero,
				tP_No: tpNo,
				bNo,
				pageIndex: 1,
				pageSize: 1000,
			});
			const resRecord = asRecord(res);
			const linesArray = Array.isArray(res) ? res : Array.isArray(resRecord.data) ? resRecord.data : [];
			setLines(linesArray as DocumentLine[]);

			const [taxesRes, totauxRes] = await Promise.all([
				getTaxesLignes(epNumero, tpNo),
				getTotauxDocument(epNumero, tpNo),
			]);
			const taxesRecord = asRecord(taxesRes);
			setTaxes(
				(Array.isArray(taxesRes) ? taxesRes : Array.isArray(taxesRecord.data) ? taxesRecord.data : []) as TaxLine[],
			);
			setTotaux(asRecord(totauxRes));
		} catch {
			setLines([]);
		}
	}, [epNumero, tpNo, isNew, bNo]);

	useEffect(() => {
		void loadDocument();
	}, [loadDocument]);

	const loadArticlePickerRows = useCallback(
		async (pageZeroBased: number): Promise<void> => {
			setArticlePickerLoading(true);
			try {
				const params = new URLSearchParams();
				params.set("pageIndex", String(pageZeroBased + 1));
				params.set("pageSize", String(articlePickerPageSize));
				params.set("actionView", "Choix");
				const depotNo = asNumber(getValue(document, "dE_No", "DE_No"));
				if (depotNo) params.set("dE_No", String(depotNo));
				if (articlePickerSearchRef.trim()) params.set("aR_Ref", articlePickerSearchRef.trim());
				if (articlePickerSearchDesign.trim()) params.set("aR_Design", articlePickerSearchDesign.trim());

				const response = await apiClient.get<unknown>(`/api/article?${params.toString()}`);
				const payload = response.data as Record<string, unknown> | IArticle[] | null;
				let rows: IArticle[] = [];
				let total = 0;

				if (Array.isArray(payload)) {
					rows = payload;
					total = rows.length;
				} else if (payload && typeof payload === "object") {
					const inner = payload.data as Record<string, unknown> | IArticle[] | undefined;
					if (Array.isArray(inner)) {
						rows = inner;
						total = asNumber(payload.totalCount ?? payload.itemsCount ?? rows.length);
					} else if (inner && typeof inner === "object" && Array.isArray(inner.data)) {
						rows = inner.data as IArticle[];
						total = asNumber(inner.itemsCount ?? inner.totalCount ?? rows.length);
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
		[articlePickerPageSize, articlePickerSearchRef, articlePickerSearchDesign, document],
	);

	useEffect(() => {
		if (!articlePickerOpen) return;
		void loadArticlePickerRows(articlePickerPage);
	}, [articlePickerOpen, articlePickerPage, articlePickerTick, loadArticlePickerRows]);

	// Save document header
	const onSaveDocument = async () => {
		setSaving(true);
		try {
			const payload = {
				EP_Numero: asString(getValue(document, "eP_Numero", "EP_Numero")),
				TP_No: tpNo,
				EP_Date: toDateInputValue(getValue(document, "eP_Date", "EP_Date")),
				EP_Tiers: asString(getValue(document, "eP_Tiers", "EP_Tiers")),
				EP_DateLivraison: toDateInputValue(getValue(document, "eP_DateLivraison", "EP_DateLivraison")),
				EP_Reference: asString(getValue(document, "eP_Reference", "EP_Reference")),
				DE_No: asNumber(getValue(document, "dE_No", "DE_No")),
				CO_No: asNumber(getValue(document, "cO_No", "CO_No")),
				CA_Num: asString(getValue(document, "cA_Num", "CA_Num")),
				CL_ChampLibre: stringifyChampsLibre(champsLibreEntete),
			};

			const res = await saveDetailsDocument(payload);
			const resRecord = asRecord(res);
			if (!res || asBool(resRecord.isValid) || asString(resRecord.EP_Numero || resRecord.eP_Numero)) {
				toast.success("Document enregistré");
				const savedNumero = asString(resRecord.EP_Numero || resRecord.eP_Numero);
				if (isNew && savedNumero) {
					setSearchParams({ epNumero: savedNumero, tpNo: String(tpNo) });
				}
			} else {
				toast.error(asString(resRecord.Message) || "Erreur d'enregistrement");
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur d'enregistrement");
		} finally {
			setSaving(false);
		}
	};

	const openArticlePicker = () => {
		if (isReadOnly) return;
		setArticlePickerPage(0);
		setArticlePickerOpen(true);
	};

	const handleArticlePickerApplyFilters = () => {
		setArticlePickerPage(0);
		setArticlePickerTick((tick) => tick + 1);
	};

	const applyArticleFromPicker = (row: IArticle) => {
		const { ref, design, prixAchat } = extractArticleCatalogFields(row);
		if (!ref) {
			toast.error("Référence article invalide.");
			return;
		}

		setLineForm((prev) => ({
			...prev,
			ar_Ref: ref,
			ar_Design: design,
			lp_PrixUnitaire: prixAchat || prev.lp_PrixUnitaire,
		}));
		setArticlePickerOpen(false);
		toast.success("Article sélectionné.");
	};

	// Change document state (clôturer/déclôturer)
	const onChangerEtat = async () => {
		let typeValidation = Type_Validation_Document.Cloturer;

		// Vérifier l'état actuel du document
		const currentValidation = asNumber(getValue(document, "eP_ValiderAERP", "EP_ValiderAERP"));

		if (currentValidation === Type_Validation_Document.Cloturer) {
			// Déclôturer
			typeValidation = Type_Validation_Document.Encours;
		} else if (
			currentValidation === Type_Validation_Document.Encours ||
			currentValidation === Type_Validation_Document.Encours_Creation
		) {
			// Clôturer
			typeValidation = Type_Validation_Document.Cloturer;
		} else if (currentValidation === Type_Validation_Document.Valider_Sage) {
			toast.error("Document déjà validé");
			return;
		} else if (currentValidation === Type_Validation_Document.Annuler) {
			toast.error("Document déjà annulé");
			return;
		}

		const message =
			typeValidation === Type_Validation_Document.Cloturer
				? "Êtes-vous sûr de vouloir clôturer ce document ?"
				: "Êtes-vous sûr de vouloir dé-clôturer ce document ?";

		if (!window.confirm(message)) return;

		try {
			const res = await changerEtatDocument(
				asString(getValue(document, "eP_Numero", "EP_Numero")),
				tpNo,
				asNumber(getValue(document, "b_No", "B_No")),
				typeValidation,
			);
			const resRecord = asRecord(res);
			// Handle both new API (returns empty Ok or { totalementCloturer }) and old API (returns { isValid: true, ... })
			if (
				!res ||
				asBool(resRecord.isValid) ||
				asBool(resRecord.IsValid) ||
				resRecord.totalementCloturer !== undefined ||
				resRecord.TotalementCloturer !== undefined
			) {
				// Mettre à jour localement l'état du document
				setDocument((prev) => ({
					...prev,
					eP_ValiderAERP: typeValidation,
					EP_ValiderAERP: typeValidation,
				}));

				toast.success("État changé avec succès");

				// Recharger les données complètes
				await loadDocument();

				// Vérifier si totalement clôturé et proposer la redirection
				if (asBool(resRecord.totalementCloturer) || asBool(resRecord.TotalementCloturer)) {
					if (window.confirm("Cette demande a été totalement clôturée. Voulez-vous consulter le récap ?")) {
						const bNoValue = asNumber(getValue(document, "b_No", "B_No"));
						// Utiliser l'URL avec paramètres de recherche pour naviguer vers les détails
						navigate(`/besoins?view=details&id=${bNoValue}`);
					}
				}
			} else {
				toast.error(asString(resRecord.Message) || asString(resRecord.message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// Validate in Sage
	const onValiderSage = async () => {
		if (!window.confirm("Êtes-vous sûr de vouloir valider ce document ?")) return;
		try {
			const res = await validerDocumentSage(asString(document.eP_Numero ?? document.EP_Numero), tpNo);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid) || asBool(resRecord.IsValid)) {
				toast.success("Document validé dans Sage");
				setDocument((prev) => ({
					...prev,
					eP_NumeroSage: resRecord.eP_NumeroSage ?? resRecord.EP_NumeroSage,
					eP_ValiderAERP: Type_Validation_Document.Valider_Sage,
				}));
			} else {
				toast.error(asString(resRecord.Message) || asString(resRecord.message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// Cancel document
	const onAnnuler = async () => {
		if (!window.confirm("Êtes-vous sûr de vouloir annuler ce document ?")) return;
		try {
			const res = await annulerDocumentSage(asString(document.eP_Numero ?? document.EP_Numero), tpNo);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid) || asBool(resRecord.IsValid)) {
				toast.success("Document annulé");
				await loadDocument();
			} else {
				toast.error(asString(resRecord.Message) || asString(resRecord.message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// Transform to purchase order
	const onTransformer = async () => {
		const gardeTrace = window.confirm("Est-ce que garder la trace de ce document ?");
		try {
			const res = await transformerBonCommande(
				asString(document.eP_Numero ?? document.EP_Numero),
				tpNo,
				TypeSage.BC_Achat,
				gardeTrace,
			);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid) || asBool(resRecord.IsValid)) {
				if (!gardeTrace && (asBool(resRecord.redirectToBC) || asBool(resRecord.RedirectToBC))) {
					window.location.href = "/document/bons-commande";
				} else {
					toast.success("Document transformé");
					await loadDocument();
				}
			} else {
				toast.error(asString(resRecord.Message) || asString(resRecord.message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// Account document
	const onComptabiliser = async () => {
		if (!window.confirm("Êtes-vous sûr de vouloir comptabiliser ce document ?")) return;
		try {
			const res = await comptabiliserDocument(asString(document.eP_Numero ?? document.EP_Numero), tpNo);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid) || asBool(resRecord.IsValid)) {
				toast.success("Document comptabilisé");
				setDocument((prev) => ({ ...prev, eP_Comptabiliser: 1, EP_Comptabiliser: 1 }));
			} else {
				toast.error(asString(resRecord.Message) || asString(resRecord.message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// Save line
	const onSaveLine = async () => {
		try {
			if (!lineForm.ar_Ref) throw new Error("Choix d'article est obligatoire");
			if (!lineForm.lp_QteMvt || lineForm.lp_QteMvt <= 0) throw new Error("Quantité invalide");

			const payload = {
				DL_No: lineForm.lP_No,
				AR_Ref: lineForm.ar_Ref,
				AR_Design: lineForm.ar_Design,
				CA_Num: lineForm.ca_Num_Ligne,
				LP_DateLivraison: toDateInputValue(lineForm.lp_DateLivraison),
				DL_QteMvt: lineForm.lp_QteMvt,
				DL_ValeurRemise: lineForm.lp_ValeurRemise || 0,
				DL_TypeRemise: lineForm.lp_TypeRemise,
				DL_PrixUnitaire: lineForm.lp_PrixUnitaire || 0,
				CL_ChampLibre: stringifyChampsLibre(champsLibreLigne),
				DE_No: asNumber(getValue(document, "dE_No", "DE_No")),
				CT_Num: asString(getValue(document, "eP_Tiers", "EP_Tiers")),
			};

			const res = await addOrUpdateLigneDocument(asString(getValue(document, "eP_Numero", "EP_Numero")), tpNo, payload);
			const resRecord = asRecord(res);
			if (!res || asBool(resRecord.isValid) || Object.keys(resRecord).length === 0) {
				toast.success("Ligne enregistrée");
				await loadLines();
				onNewLine();
			} else {
				toast.error(asString(resRecord.Message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// Delete line
	const onDeleteLine = async () => {
		if (!selectedLineId) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) return;
		try {
			const res = await deleteLigneDocument(selectedLineId);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
				toast.success("Ligne supprimée");
				await loadLines();
				onNewLine();
			} else {
				toast.error(asString(resRecord.Message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	// New line
	const onNewLine = () => {
		setSelectedLineId(0);
		setLineForm({
			lP_No: 0,
			ar_Ref: "",
			ar_Design: "",
			ca_Num_Ligne: asString(document.cA_Num ?? document.CA_Num),
			lp_DateLivraison: toDateInputValue(getValue(document, "eP_DateLivraison", "EP_DateLivraison")),
			lp_QteMvt: 1,
			lp_ValeurRemise: 0,
			lp_TypeRemise: 1,
			lp_PrixUnitaire: 0,
		});
		setChampsLibreLigne({});
	};

	// Select line
	const onSelectLine = (line: DocumentLine) => {
		setSelectedLineId(line.lP_No);
		setLineForm({
			lP_No: line.lP_No,
			ar_Ref: line.aR_Ref,
			ar_Design: line.aR_Design,
			ca_Num_Ligne: line.cA_Intitule_Affaire,
			lp_DateLivraison: toDateInputValue(line.lP_DateLivraison),
			lp_QteMvt: line.lP_QteMvt,
			lp_ValeurRemise: parseFloat(String(line.lP_Remise)) || 0,
			lp_TypeRemise: 1,
			lp_PrixUnitaire: line.lP_PrixUnitaire,
		});
	};

	// Print
	const onPrint = () => {
		window.open(
			`/rapport?eP_Numero=${asString(document.eP_Numero ?? document.EP_Numero)}&tP_NO=${tpNo}&reportType=Document`,
		);
	};

	// Close
	const onClose = () => {
		if (!isBC) {
			window.location.href = "/document/demandes-prix";
		} else {
			window.location.href = "/document/bons-commande";
		}
	};

	// New document
	const onNew = () => {
		setSearchParams({ epNumero: "", tpNo: String(tpNo) });
	};

	const totalRows: Array<[string, unknown]> = [
		["Total HT", getValue(totaux, "totalHT", "TotalHT")],
		["Total TVA", getValue(totaux, "totalTVA", "TotalTVA")],
		["Total TTC", getValue(totaux, "totalTTC", "TotalTTC")],
		["Net à payer", getValue(totaux, "netAPayer", "NetAPayer")],
	];

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
				<Typography>Chargement...</Typography>
			</Box>
		);
	}

	const isReadOnly = isCloturer || isValiderSage || isAnnuler;

	return (
		<>
			<style>{DETAIL_STYLES}</style>
			<Box className="document-detail-page">
				{/* Breadcrumb */}
				<Box className="document-breadcrumb">
					<a href="/" style={{ textDecoration: "none", color: "inherit" }}>
						Accueil
					</a>
					{" / "}
					{!isBC ? (
						<a href="/document/demandes-prix" style={{ textDecoration: "none", color: "inherit" }}>
							Demandes des prix
						</a>
					) : (
						<a href="/document/bons-commande" style={{ textDecoration: "none", color: "inherit" }}>
							Bons de commande
						</a>
					)}
					{" / "}
					<strong>
						{isNew
							? "Nouveau document"
							: `${docNumero} (${asString(getValue(document, "eP_Tiers", "EP_Tiers"))} | ${asString(getValue(document, "cT_Intitule", "CT_Intitule"))})`}
					</strong>
				</Box>

				{/* Action Buttons */}
				<Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
					{permissions.ajouter && (
						<Button variant="contained" color="success" size="small" startIcon={<AddIcon />} onClick={onNew}>
							Nouveau
						</Button>
					)}
					{(permissions.ajouter || permissions.modifier) && !isReadOnly && (
						<Button
							variant="contained"
							size="small"
							startIcon={<SaveIcon />}
							onClick={() => void onSaveDocument()}
							disabled={saving}
						>
							Enregistrer
						</Button>
					)}
					{permissions.cloturer && (
						<Button
							variant="contained"
							color={isCloturer ? "warning" : "success"}
							size="small"
							startIcon={<CheckIcon />}
							onClick={() => void onChangerEtat()}
							disabled={isValiderSage || isAnnuler}
						>
							{isCloturer ? "Déclôturer" : "Clôturer"}
						</Button>
					)}
					{permissions.annuler && isBC && !isAnnuler && !isValiderSage && (
						<Button
							variant="contained"
							color="error"
							size="small"
							startIcon={<CloseIcon />}
							onClick={() => void onAnnuler()}
						>
							Annuler
						</Button>
					)}
					{permissions.validerSage && isCloturer && (
						<Button
							variant="contained"
							color="success"
							size="small"
							startIcon={<CheckIcon />}
							onClick={() => void onValiderSage()}
						>
							Valider sage
						</Button>
					)}
					{permissions.transformer && isCloturer && (
						<Button
							variant="contained"
							color="info"
							size="small"
							startIcon={<CopyIcon />}
							onClick={() => void onTransformer()}
						>
							Transformer
						</Button>
					)}
					{permissions.comptabiliser &&
						isValiderSage &&
						isBC &&
						!asNumber(getValue(document, "eP_Comptabiliser", "EP_Comptabiliser")) && (
							<Button
								variant="contained"
								color="success"
								size="small"
								startIcon={<CheckIcon />}
								onClick={() => void onComptabiliser()}
							>
								Comptabiliser
							</Button>
						)}
					{permissions.imprimer && !isNew && (
						<Button variant="contained" color="inherit" size="small" startIcon={<PrintIcon />} onClick={onPrint}>
							Imprimer
						</Button>
					)}
					{isTotallyClotured && (
						<Button
							variant="contained"
							color="info"
							size="small"
							startIcon={<InfoIcon />}
							onClick={() => navigate(`/besoins?view=details&id=${bNo}`)}
						>
							Consulter le récap
						</Button>
					)}
					<Button variant="outlined" size="small" startIcon={<CloseIcon />} onClick={onClose}>
						Fermer
					</Button>
				</Stack>

				{/* Document Header Card */}
				<Card className="document-shell" sx={{ mb: 1 }}>
					<CardContent className="document-panel">
						<Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
							Entête document
						</Typography>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									label="Numéro"
									value={asString(document.eP_Numero ?? document.EP_Numero)}
									fullWidth
									size="small"
									slotProps={{ input: { readOnly: true } }}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<Box sx={{ display: "flex", gap: 1 }}>
									<IconButton size="small" color="info" disabled={isReadOnly || !isNew}>
										<SearchIcon />
									</IconButton>
									<TextField
										label="Fournisseur"
										value={asString(document.eP_Tiers ?? document.EP_Tiers)}
										size="small"
										sx={{ width: 100 }}
										slotProps={{ input: { readOnly: true } }}
									/>
									<TextField
										value={asString(document.cT_Intitule ?? document.CT_Intitule)}
										size="small"
										fullWidth
										slotProps={{ input: { readOnly: true } }}
									/>
								</Box>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									label="Date"
									type="date"
									value={asString(document.eP_Date ?? document.EP_Date)?.split("T")[0] || dayjs().format("YYYY-MM-DD")}
									onChange={(e) => setDocument((prev) => ({ ...prev, eP_Date: e.target.value }))}
									fullWidth
									size="small"
									disabled={isReadOnly}
									slotProps={{ inputLabel: { shrink: true } }}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									label="Date livraison"
									type="date"
									value={
										asString(document.eP_DateLivraison ?? document.EP_DateLivraison)?.split("T")[0] ||
										dayjs().add(7, "day").format("YYYY-MM-DD")
									}
									onChange={(e) => setDocument((prev) => ({ ...prev, eP_DateLivraison: e.target.value }))}
									fullWidth
									size="small"
									disabled={isReadOnly}
									slotProps={{ inputLabel: { shrink: true } }}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<TextField
									label="Référence"
									value={asString(document.eP_Reference ?? document.EP_Reference)}
									onChange={(e) => setDocument((prev) => ({ ...prev, eP_Reference: e.target.value }))}
									fullWidth
									size="small"
									disabled={isReadOnly}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<FormControl fullWidth size="small" disabled={isReadOnly}>
									<InputLabel>Commercial</InputLabel>
									<Select
										value={asNumber(document.cO_No ?? document.CO_No) || 0}
										onChange={(e) => setDocument((prev) => ({ ...prev, cO_No: e.target.value }))}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{asNumber(document.cO_No ?? document.CO_No) > 0 && (
											<MenuItem value={asNumber(document.cO_No ?? document.CO_No)}>
												{asNumber(document.cO_No ?? document.CO_No)}
											</MenuItem>
										)}
									</Select>
								</FormControl>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<FormControl fullWidth size="small" disabled={isReadOnly}>
									<InputLabel>Dépôt</InputLabel>
									<Select
										value={asNumber(document.dE_No ?? document.DE_No) || 0}
										onChange={(e) => setDocument((prev) => ({ ...prev, dE_No: e.target.value }))}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{asNumber(document.dE_No ?? document.DE_No) > 0 && (
											<MenuItem value={asNumber(document.dE_No ?? document.DE_No)}>
												{asNumber(document.dE_No ?? document.DE_No)}
											</MenuItem>
										)}
									</Select>
								</FormControl>
							</Grid>
							<Grid size={{ xs: 12, md: 4 }}>
								<FormControl fullWidth size="small" disabled={isReadOnly}>
									<InputLabel>Affaire</InputLabel>
									<Select
										value={asString(document.cA_Num ?? document.CA_Num)}
										onChange={(e) => setDocument((prev) => ({ ...prev, cA_Num: e.target.value }))}
									>
										<MenuItem value="">Choisir</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							{isValiderSage && (
								<Grid size={{ xs: 12, md: 4 }}>
									<TextField
										label="N° Sage"
										value={asString(document.eP_NumeroSage ?? document.EP_NumeroSage)}
										fullWidth
										size="small"
										slotProps={{ input: { readOnly: true } }}
									/>
								</Grid>
							)}
						</Grid>
					</CardContent>
				</Card>

				{/* Tabs */}
				<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
					<Tab label="Lignes document" />
					{permissions.consulterAttach && <Tab label="Attachements" />}
				</Tabs>

				{/* Lines Tab */}
				{activeTab === 0 && (
					<>
						{/* Line Form */}
						<Card sx={{ mb: 2 }}>
							<CardContent>
								<Grid container spacing={2} sx={{ alignItems: "flex-end" }}>
									<Grid size={{ xs: 12, md: 2 }}>
										<Box sx={{ display: "flex", gap: 1 }}>
											<IconButton
												size="small"
												color="info"
												disabled={isReadOnly}
												onClick={openArticlePicker}
												title="Choisir un article"
											>
												<SearchIcon />
											</IconButton>
											<TextField
												label="Référence *"
												value={lineForm.ar_Ref}
												onChange={(e) => setLineForm((p) => ({ ...p, ar_Ref: e.target.value }))}
												size="small"
												fullWidth
												disabled={isReadOnly}
											/>
										</Box>
									</Grid>
									<Grid size={{ xs: 12, md: 3 }}>
										<TextField
											label="Désignation *"
											value={lineForm.ar_Design}
											onChange={(e) => setLineForm((p) => ({ ...p, ar_Design: e.target.value }))}
											size="small"
											fullWidth
											disabled={isReadOnly}
										/>
									</Grid>
									<Grid size={{ xs: 12, md: 2 }}>
										<FormControl fullWidth size="small" disabled={isReadOnly}>
											<InputLabel>Affaire</InputLabel>
											<Select
												value={lineForm.ca_Num_Ligne}
												onChange={(e) => setLineForm((p) => ({ ...p, ca_Num_Ligne: e.target.value }))}
											>
												<MenuItem value="">Choisir</MenuItem>
											</Select>
										</FormControl>
									</Grid>
									<Grid size={{ xs: 12, md: 2 }}>
										<TextField
											label="Date livraison"
											type="date"
											value={lineForm.lp_DateLivraison}
											onChange={(e) => setLineForm((p) => ({ ...p, lp_DateLivraison: e.target.value }))}
											fullWidth
											size="small"
											disabled={isReadOnly}
											slotProps={{ inputLabel: { shrink: true } }}
										/>
									</Grid>
									<Grid size={{ xs: 12, md: 1 }}>
										<TextField
											label="Qté"
											type="number"
											value={lineForm.lp_QteMvt}
											onChange={(e) => setLineForm((p) => ({ ...p, lp_QteMvt: Number(e.target.value) }))}
											size="small"
											fullWidth
											disabled={isReadOnly}
										/>
									</Grid>
									<Grid size={{ xs: 12, md: 2 }}>
										<Box sx={{ display: "flex", gap: 1 }}>
											<FormControl size="small" sx={{ width: 60 }} disabled={isReadOnly}>
												<Select
													value={lineForm.lp_TypeRemise}
													onChange={(e) => setLineForm((p) => ({ ...p, lp_TypeRemise: Number(e.target.value) }))}
												>
													<MenuItem value={0}>Mnt</MenuItem>
													<MenuItem value={1}>%</MenuItem>
												</Select>
											</FormControl>
											<TextField
												label="Remise"
												type="number"
												value={lineForm.lp_ValeurRemise}
												onChange={(e) => setLineForm((p) => ({ ...p, lp_ValeurRemise: Number(e.target.value) }))}
												size="small"
												fullWidth
												disabled={isReadOnly}
											/>
										</Box>
									</Grid>
									<Grid size={{ xs: 12, md: 2 }}>
										<TextField
											label="Prix d'achat"
											type="number"
											value={lineForm.lp_PrixUnitaire}
											onChange={(e) => setLineForm((p) => ({ ...p, lp_PrixUnitaire: Number(e.target.value) }))}
											size="small"
											fullWidth
											disabled={isReadOnly}
										/>
									</Grid>
								</Grid>
							</CardContent>
						</Card>

						{/* Line Actions */}
						<Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", justifyContent: "flex-start" }}>
							<Button
								variant="outlined"
								size="small"
								startIcon={<AttachFileIcon />}
								disabled={isReadOnly || !selectedLineId}
							>
								Attachements
							</Button>
							<Button
								variant="contained"
								color="success"
								size="small"
								startIcon={<AddIcon />}
								onClick={onNewLine}
								disabled={isReadOnly}
							>
								Nouveau
							</Button>
							{permissions.supprimerLD && (
								<Button
									variant="contained"
									color="error"
									size="small"
									startIcon={<DeleteIcon />}
									onClick={() => void onDeleteLine()}
									disabled={isReadOnly || !selectedLineId}
								>
									Supprimer
								</Button>
							)}
							<Button
								variant="contained"
								size="small"
								startIcon={<SaveIcon />}
								onClick={() => void onSaveLine()}
								disabled={isReadOnly}
							>
								Enregistrer
							</Button>
						</Stack>

						<Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
							<Typography variant="body2" sx={{ fontWeight: 600 }}>
								Lignes :
							</Typography>
							<FormControl size="small" sx={{ width: 72 }}>
								<Select value={linePageSize} onChange={(e) => setLinePageSize(Number(e.target.value))}>
									<MenuItem value={10}>10</MenuItem>
									<MenuItem value={25}>25</MenuItem>
									<MenuItem value={50}>50</MenuItem>
									<MenuItem value={100}>100</MenuItem>
								</Select>
							</FormControl>
							<Typography variant="caption" color="text.secondary">
								{lines.length} ligne(s)
							</Typography>
						</Stack>

						{/* Lines Table */}
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow sx={{ bgcolor: "#f5f5f5" }}>
										<TableCell>Référence</TableCell>
										<TableCell>Désignation</TableCell>
										<TableCell>Affaire</TableCell>
										<TableCell>Date liv.</TableCell>
										<TableCell align="right">Prix unitaire</TableCell>
										<TableCell align="right">PU TTC</TableCell>
										<TableCell align="right">Qté</TableCell>
										<TableCell>Remise</TableCell>
										<TableCell align="right">TVA</TableCell>
										<TableCell align="right">Montant HT</TableCell>
										<TableCell align="right">Montant TTC</TableCell>
										<TableCell align="center">Actions</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{lines.length === 0 && (
										<TableRow>
											<TableCell colSpan={12} align="center">
												Aucune ligne
											</TableCell>
										</TableRow>
									)}
									{selectedLines.map((line) => (
										<TableRow
											key={line.lP_No}
											sx={{
												cursor: "pointer",
												bgcolor: selectedLineId === line.lP_No ? "action.selected" : "inherit",
											}}
											onClick={() => onSelectLine(line)}
										>
											<TableCell>{line.aR_Ref}</TableCell>
											<TableCell>{line.aR_Design}</TableCell>
											<TableCell>{line.cA_Intitule_Affaire}</TableCell>
											<TableCell>
												{line.lP_DateLivraison ? dayjs(line.lP_DateLivraison).format("DD/MM/YYYY") : ""}
											</TableCell>
											<TableCell align="right">{line.lP_PrixUnitaire ? line.lP_PrixUnitaire.toFixed(2) : ""}</TableCell>
											<TableCell align="right">{line.lP_PUTTC ? line.lP_PUTTC.toFixed(2) : ""}</TableCell>
											<TableCell align="right">{line.lP_QteMvt}</TableCell>
											<TableCell>{line.lP_Remise}</TableCell>
											<TableCell align="right">{line.lP_TauxTVA ? `${line.lP_TauxTVA}%` : ""}</TableCell>
											<TableCell align="right">{line.lP_MontantHT ? line.lP_MontantHT.toFixed(2) : ""}</TableCell>
											<TableCell align="right">{line.lP_MontantTTC ? line.lP_MontantTTC.toFixed(2) : ""}</TableCell>
											<TableCell align="center">
												<Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
													{line.lP_NbAttachement > 0 && (
														<IconButton size="small" color="info" title="Voir attachements">
															<AttachFileIcon fontSize="small" />
														</IconButton>
													)}
													{line.bA_No > 0 && (
														<IconButton size="small" color="success" title="Lié à une demande de besoin">
															<OpenInNewIcon fontSize="small" />
														</IconButton>
													)}
												</Box>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>

						<Box className="tax-total-row">
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow sx={{ bgcolor: "#f8fafc" }}>
											<TableCell>Base taxe</TableCell>
											<TableCell align="right">Taux</TableCell>
											<TableCell align="right">Montant</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{taxes.length === 0 && (
											<TableRow>
												<TableCell colSpan={3} align="center">
													Aucune taxe
												</TableCell>
											</TableRow>
										)}
										{taxes.map((tax, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: taxes have no unique id
											<TableRow key={`tax-${idx}`}>
												<TableCell>{formatMoney(tax.lt_BaseTaxe)}</TableCell>
												<TableCell align="right">{tax.lt_Taux ? `${tax.lt_Taux} %` : ""}</TableCell>
												<TableCell align="right">{formatMoney(tax.lt_MontantTaxe)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<Box />
							<Box className="totals-box">
								{totalRows.map(([label, value]) => (
									<Box className="total-row" key={label}>
										<Box className="total-label">{label}</Box>
										<Box className="total-value">{formatMoney(value)}</Box>
									</Box>
								))}
							</Box>
						</Box>
					</>
				)}

				{/* Attachments Tab */}
				{activeTab === 1 && (
					<Card className="document-shell">
						<CardContent className="document-panel">
							<Box className="attachments-dropzone">
								<Typography variant="body2">Déposer des fichiers ici (ou cliquez)</Typography>
								<CloudUploadIcon sx={{ fontSize: 40, color: "#1f2937" }} />
								<Button variant="outlined" component="label" size="small" disabled={isReadOnly || isNew}>
									Parcourir
									<input hidden multiple type="file" />
								</Button>
							</Box>
						</CardContent>
					</Card>
				)}
				<Dialog open={articlePickerOpen} onClose={() => setArticlePickerOpen(false)} maxWidth="lg" fullWidth>
					<DialogTitle>Choisir un article</DialogTitle>
					<DialogContent>
						<Stack
							direction={{ xs: "column", sm: "row" }}
							spacing={2}
							sx={{ mb: 2, pt: 1, alignItems: { xs: "stretch", sm: "center" } }}
						>
							<TextField
								label="Référence"
								value={articlePickerSearchRef}
								onChange={(e) => setArticlePickerSearchRef(e.target.value)}
								size="small"
								fullWidth
							/>
							<TextField
								label="Désignation"
								value={articlePickerSearchDesign}
								onChange={(e) => setArticlePickerSearchDesign(e.target.value)}
								size="small"
								fullWidth
							/>
							<Button variant="contained" onClick={handleArticlePickerApplyFilters}>
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
											<TableRow sx={{ bgcolor: "#f8fafc" }}>
												<TableCell>Référence</TableCell>
												<TableCell>Désignation</TableCell>
												<TableCell>Famille</TableCell>
												<TableCell align="right">Prix achat</TableCell>
												<TableCell align="right" width={120}>
													Action
												</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{articlePickerRows.length === 0 && (
												<TableRow>
													<TableCell colSpan={5} align="center">
														Aucun article
													</TableCell>
												</TableRow>
											)}
											{articlePickerRows.map((row) => {
												const { ref, design, prixAchat } = extractArticleCatalogFields(row);
												const record = row as Record<string, unknown>;
												const famille = asString(
													record.fA_Intitule ?? record.FA_Intitule ?? record.fA_CodeFamille ?? "",
												);
												return (
													<TableRow
														key={`${ref}-${row.cbMarq ?? ""}`}
														hover
														sx={{ cursor: "pointer" }}
														onDoubleClick={() => applyArticleFromPicker(row)}
													>
														<TableCell>{ref}</TableCell>
														<TableCell>{design}</TableCell>
														<TableCell>{famille}</TableCell>
														<TableCell align="right">{formatMoney(prixAchat)}</TableCell>
														<TableCell align="right">
															<Button size="small" variant="contained" onClick={() => applyArticleFromPicker(row)}>
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
		</>
	);
}
