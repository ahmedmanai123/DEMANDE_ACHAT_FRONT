/** biome-ignore-all lint/suspicious/noArrayIndexKey: no stable ids on dynamic rows */
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tiersService } from "@/api/services/tiersService";
import {
	addAffectation,
	addOrUpdateRetourBesoin,
	affichieraffectionDemande,
	deleteAffectation,
	exportTableauxComparatifsExcel,
	genererAffectationFournisseur,
	genererDocument,
	getAffectationDetails,
	getArticlesSansFournisseur,
	getBesoinArticles,
	getBesoinById,
	getDetailsDemandeAAcheter,
	getDocumentsNonValider,
	getFournisseurPrincipal,
	getHistoriqueValidation,
	getLignePieceParBesoinArticleRetour,
	getTableauxComparatifs,
	getTiersDocumentsNonValider,
	rejetArticleRetourDemande,
	verifierDemandeCloturer,
} from "@/services/besoinservice";
import {
	type AFFECTATION_DEMANDEDto,
	type DA_BESOIN_ARTICLEDto,
	Etat_Affection_Demande,
	EtatRetour,
	Type_Validation,
	TypeSage,
} from "@/types/besoin";
import type { F_COMPTETDto } from "@/types/tiers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Props = {
	besoinId: number;
	tpNo?: number;
	onBack: () => void;
	canCreate?: boolean;
	canDelete?: boolean;
	canConsultDocument?: boolean;
	canAnnulerDemande?: boolean;
	canGenererBC?: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown): number => {
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number(value);
		return Number.isNaN(n) ? 0 : n;
	}
	return 0;
};

const asString = (value: unknown): string => (typeof value === "string" ? value : String(value ?? ""));

const asBool = (value: unknown): boolean => {
	if (value === true || value === 1) return true;
	if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		return asBool(record.isValid ?? record.IsValid ?? record.value ?? record.Value);
	}
	return false;
};

const getAny = (source: Record<string, unknown>, ...keys: string[]): unknown => {
	for (const key of keys) {
		const value = source[key];
		if (value !== undefined && value !== null && asString(value) !== "") return value;
	}
	return undefined;
};

const toFixedIfNumber = (value: unknown): string => {
	const n = asNumber(value);
	return n
		? new Intl.NumberFormat("fr-FR", {
				minimumFractionDigits: 0,
				maximumFractionDigits: 3,
			}).format(n)
		: "";
};

const getTiersNum = (value: unknown): string => {
	const tiers = asRecord(value);
	return asString(tiers.CT_Num ?? tiers.cT_Num ?? tiers.ct_Num);
};

const getTiersLabel = (value: unknown): string => {
	const tiers = asRecord(value);
	const code = getTiersNum(tiers);
	const intitule = asString(tiers.CT_Intitule ?? tiers.cT_Intitule ?? tiers.ct_Intitule);
	if (!code) return intitule;
	return intitule ? `${code} - ${intitule}` : code;
};

const getField = (source: Record<string, unknown>, ...keys: string[]): string => {
	return asString(getAny(source, ...keys));
};

// TypeAffectation: Fournisseur=1, Document=2
const TypeAffectation = { Fournisseur: 1, Document: 2 } as const;

const ETAT_ACHETER = 3;
const ETAT_GENERE = 2;

// ─── Styles partagés MVC-like ─────────────────────────────────────────────────

/** Input read-only identique au MVC : bordure grise, fond légèrement gris */
const readonlyInputSx = {
	width: "100%",
	border: "1px solid #ced4da",
	borderRadius: "4px",
	bgcolor: "#e9ecef",
	px: 1.25,
	py: 0.5,
	fontSize: "0.875rem",
	color: "text.primary",
	minHeight: 31,
	display: "flex",
	alignItems: "center",
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipsis",
};

/** Label col-form-label MVC */
const labelSx = {
	fontSize: "0.8125rem",
	fontWeight: 500,
	color: "text.secondary",
	mb: 0.25,
	display: "block",
};

// ─── Section header (titre bleu + ligne horizontale, style MVC) ───────────────

function SectionHeader({ title }: { title: string }) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", width: "100%", py: 0.75, cursor: "default" }}>
			<Typography sx={{ fontWeight: 500, fontSize: "1rem", color: "#1994cb", whiteSpace: "nowrap", mr: 1.5 }}>
				{title}
			</Typography>
			<Box sx={{ flex: 1, height: 2, bgcolor: "#1994cb", mt: 0.5 }} />
		</Box>
	);
}

// ─── EtatChip ─────────────────────────────────────────────────────────────────

function EtatChip({ etat }: { etat: number }) {
	const map: Record<number, { label: string; color: string }> = {
		0: { label: "Brouillon", color: "#333" },
		1: { label: "En cours", color: "#1565c0" },
		2: { label: "Demande générée", color: "#1565c0" },
		3: { label: "Acheté", color: "#2e7d32" },
		4: { label: "Validé", color: "#2e7d32" },
	};
	const cfg = map[etat] ?? { label: "Inconnu", color: "#333" };
	return (
		<Chip
			label={cfg.label}
			size="small"
			sx={{ bgcolor: cfg.color, color: "#fff", fontWeight: 600, borderRadius: "4px" }}
		/>
	);
}

// ─── EtatRetourChip ───────────────────────────────────────────────────────────

function EtatRetourChip({ etat }: { etat: number }) {
	const map: Record<number, { label: string; color: string; icon: ReactElement }> = {
		0: { label: "Non effectué", color: "#343a40", icon: <HourglassEmptyIcon fontSize="small" /> },
		1: { label: "En cours", color: "#ffc107", icon: <ScheduleIcon fontSize="small" /> },
		2: { label: "En attente validation acheteur", color: "#17a2b8", icon: <VerifiedUserIcon fontSize="small" /> },
		3: { label: "Validée", color: "#28a745", icon: <CheckCircleIcon fontSize="small" /> },
		4: { label: "Refusée", color: "#dc3545", icon: <CancelIcon fontSize="small" /> },
		5: { label: "Achetée", color: "#007bff", icon: <ShoppingCartIcon fontSize="small" /> },
	};
	const cfg = map[etat] ?? { label: "Inconnu", color: "#666", icon: undefined };
	return (
		<Chip
			label={cfg.label}
			size="small"
			icon={cfg.icon}
			sx={{ bgcolor: cfg.color, color: "#fff", fontWeight: 500, "& .MuiChip-icon": { color: "#fff" } }}
		/>
	);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BesoinAffectationPage({
	besoinId,
	tpNo = 0,
	onBack,
	canCreate = true,
	canDelete = true,
	canConsultDocument = false,
	canAnnulerDemande = false,
	canGenererBC = false,
}: Props) {
	// ── State ──────────────────────────────────────────────────────────────────
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [generating, setGenerating] = useState(false);

	const [details, setDetails] = useState<Record<string, unknown>>({});
	const [besoin, setBesoin] = useState<Record<string, unknown>>({});
	const [articles, setArticles] = useState<DA_BESOIN_ARTICLEDto[]>([]);
	const [affectations, setAffectations] = useState<AFFECTATION_DEMANDEDto[]>([]);
	const [fournisseurs, setFournisseurs] = useState<F_COMPTETDto[]>([]);
	const [docs, setDocs] = useState<Array<{ value: string; text: string }>>([]);
	const [retourRowsByArticle, setRetourRowsByArticle] = useState<Record<number, Record<string, unknown>[]>>({});
	const [selectedRetourRows, setSelectedRetourRows] = useState<Record<number, Record<string, unknown>>>({});
	const [historiqueRows, setHistoriqueRows] = useState<Record<string, unknown>[]>([]);
	const [historiqueFilter, setHistoriqueFilter] = useState({
		V_Type: Type_Validation.Demande_Besoin,
		V_Status: -1,
		V_Role_Validateur: -1,
	});
	const [comparatifColumns, setComparatifColumns] = useState<string[]>([]);
	const [comparatifVisibleKeys, setComparatifVisibleKeys] = useState<string[]>([]);
	const [comparatifRows, setComparatifRows] = useState<Record<string, unknown>[]>([]);
	const [showValidationRetour, setShowValidationRetour] = useState(false);

	const [form, setForm] = useState({
		aD_No: 0,
		bA_No: 0,
		aD_TypeAffectation: TypeAffectation.Fournisseur as number,
		eP_Tiers: "",
		aD_NoDocument_Affectation: 0,
		aD_NoOrigine: 0,
		aD_NoListDoc: 0,
		listLignePiece: 0,
	});

	// ── Valeurs dérivées ───────────────────────────────────────────────────────

	const demande = asRecord(details.demande);
	const etatAffectation = asNumber(getAny(demande, "B_Etat_Affectation_Acheteur", "b_Etat_Affectation_Acheteur"));
	const adTypeDemande = asNumber(getAny(demande, "AD_TypeDemande", "aD_TypeDemande"));
	const bNumero = getField(demande, "B_Numero", "b_Numero") || getField(besoin, "B_Numero", "b_Numero");
	const storedTpNo = asNumber(getAny(demande, "B_TypeDocument", "b_TypeDocument", "TP_No", "tP_No"));
	const actualTpNo = tpNo !== 0 ? tpNo : storedTpNo || TypeSage.Demande_Achat;

	// Champs entête — identiques au MVC
	const bTitre = getField(demande, "B_Titre", "b_Titre") || getField(besoin, "B_Titre", "b_Titre");
	const bDate = getField(demande, "B_Date", "b_Date") || getField(besoin, "B_Date", "b_Date");
	const bDemandeur = getField(demande, "D_Intitule", "d_Intitule", "Demandeur", "demandeur");
	const bAffaire = getField(demande, "CA_Intitule", "cA_Intitule", "CA_Num", "cA_Num");
	const bDepot = getField(demande, "DE_Intitule", "dE_Intitule", "Depot", "depot");
	const bDateLivraison = getField(demande, "B_DateLivraison", "b_DateLivraison");
	const bDegreImportance = asNumber(getAny(demande, "B_DegreImportance", "b_DegreImportance"));
	const importanceLabels: Record<number, string> = {
		0: "Non définie", 1: "Basse", 2: "Moyenne", 3: "Haute", 4: "Très haute", 5: "Maximum",
	};
	const typeDocLabel = actualTpNo === TypeSage.BC_Achat ? "Bon de commande achat" : "Demande de prix";

	const existDemandeGenerer = asBool(getAny(details, "exist_Demande_Generer", "Exist_Demande_Generer"));
	const lieeDemandeGenerer = asBool(getAny(details, "liee_Demande_Generer", "Liee_Demande_Generer"));
	const isParticelAffection = asBool(
		getAny(details, "isParticelaffection", "isParticelaffectionDemandeRetour", "IsParticelaffectionDemandeRetour"),
	);
	const vId = asNumber(getAny(details, "v_Id", "V_Id"));
	const vAcheteur = asBool(getAny(details, "v_Acheteur", "V_Acheteur"));
	const disabledAff = asBool(getAny(details, "Disabled_Aff", "disabled_Aff"));

	const isRetourDemande = adTypeDemande === Type_Validation.Retour_Demande_Validation;
	const isAcheter = etatAffectation === ETAT_ACHETER;
	const isGenereOuPlus = etatAffectation >= ETAT_GENERE;

	const { showFormButtons, showHistorique, formDisabled } = useMemo(() => {
		if (isAcheter) {
			return { showFormButtons: false, showHistorique: true, formDisabled: true };
		}
		if (isGenereOuPlus) {
			if (disabledAff || etatAffectation >= ETAT_GENERE) {
				if (isAcheter) {
					return { showFormButtons: false, showHistorique: true, formDisabled: true };
				}
				return { showFormButtons: true, showHistorique: true, formDisabled: false };
			}
		}
		return { showFormButtons: true, showHistorique: false, formDisabled: false };
	}, [isAcheter, isGenereOuPlus, disabledAff, etatAffectation]);

	const showFournisseur = !isRetourDemande && form.aD_TypeAffectation === TypeAffectation.Fournisseur;
	const showDocument = !isRetourDemande && form.aD_TypeAffectation === TypeAffectation.Document;
	const isRetourSansPartiel = isRetourDemande && !isParticelAffection;
	const showColonnesDocument = existDemandeGenerer && !isRetourDemande;

	// ─── FIX : ListLignePiece visible uniquement hors mode retour-sans-partiel
	// MVC : dans changerEtatAffectation → else { $('.ListLignePiece').hide(); }
	// => visible seulement quand on N'EST PAS en retour sans partiel
	const showListLignePiece = !isRetourSansPartiel;

	const showDivDemande = !showValidationRetour;
	const showBtnCommande = showValidationRetour && canGenererBC;
	const showBtnAnnuler = canAnnulerDemande && !isAcheter;
	const showCrudButtons = showFormButtons && !showValidationRetour;
	const showBtnGenerer = !isRetourSansPartiel && showFormButtons && !isAcheter;
	const showBtnValider = showFormButtons && !isAcheter;

	const showBtnNouveau = showCrudButtons && canCreate;
	const showBtnEnregistrer = showCrudButtons && canCreate;
	const showBtnSupprimer = showCrudButtons && canDelete;

	const fournisseurOptions = useMemo(() => {
		const options = fournisseurs
			.map((f) => ({ value: getTiersNum(f), text: getTiersLabel(f) }))
			.filter((f) => f.value);
		if (form.eP_Tiers && !options.some((o) => o.value === form.eP_Tiers)) {
			return [{ value: form.eP_Tiers, text: form.eP_Tiers }, ...options];
		}
		return options;
	}, [form.eP_Tiers, fournisseurs]);

	// ── loadDocsForAffectation ─────────────────────────────────────────────────

	const loadDocsForAffectation = useCallback(
		async (aD_No: number): Promise<void> => {
			if (!aD_No) { setDocs([]); return; }
			try {
				const epTiers = await getTiersDocumentsNonValider(aD_No);
				const rows = (await getDocumentsNonValider(actualTpNo, epTiers)) as Array<Record<string, unknown>>;
				setDocs(
					(rows ?? []).map((r) => ({
						value: asString(r.Value ?? r.value ?? r.LP_No ?? r.lP_No),
						text: asString(r.Text ?? r.text ?? r.LP_NumDocument ?? r.lP_NumDocument ?? r.Document ?? r.document),
					})),
				);
				setForm((prev) => ({ ...prev, eP_Tiers: epTiers }));
			} catch { setDocs([]); }
		},
		[actualTpNo],
	);

	// ── loadAll ────────────────────────────────────────────────────────────────

	// biome-ignore lint/correctness/useExhaustiveDependencies: actualTpNo and besoinId cover all deps
	const loadAll = useCallback(async (): Promise<void> => {
		setLoading(true);
		try {
			const [d, b, a, aff, tiersResponse] = await Promise.all([
				getDetailsDemandeAAcheter(besoinId),
				getBesoinById(besoinId),
				getBesoinArticles(besoinId),
				getAffectationDetails({ B_No: besoinId, TP_No: actualTpNo }),
				tiersService
					.getTiers({ CT_Type: 1, CT_Sommeil: 0, pageIndex: 1, pageSize: 500 })
					.catch(() => ({ data: [] as F_COMPTETDto[], total: 0, pageIndex: 1, pageSize: 500, totalPages: 0 })),
			]);
			const dR = asRecord(d);
			const bR = asRecord(b);
			const tiersRecord = asRecord(tiersResponse);
			const tiersRows = Array.isArray(tiersRecord.data)
				? tiersRecord.data
				: Array.isArray(tiersRecord.items) ? tiersRecord.items : [];
			setDetails(dR);
			setBesoin(bR);
			setArticles(Array.isArray(a) ? a : []);
			setAffectations(Array.isArray(asRecord(aff).data) ? (asRecord(aff).data as AFFECTATION_DEMANDEDto[]) : []);
			setFournisseurs(tiersRows as F_COMPTETDto[]);

			setHistoriqueFilter((currentFilter) => {
				void getHistoriqueValidation(
					{ B_No: besoinId, BT_Id: asNumber(getAny(bR, "BT_Id", "bT_Id")), ...currentFilter } as never,
					currentFilter.V_Type as never,
				).then((hist) => {
					setHistoriqueRows(Array.isArray(hist.data) ? (hist.data as Record<string, unknown>[]) : []);
				});
				return currentFilter;
			});

			// Tableaux comparatifs
			const comp = await getTableauxComparatifs(besoinId);
			const compRecord = asRecord(comp);
			const compRows = Array.isArray(compRecord.dataArray) ? (compRecord.dataArray as unknown[][]) : [];
			if (compRows.length > 0) {
				const allColumnNames = compRows[0].map((col) => asString(col));
				const posMoinsDisantIndex = allColumnNames.findIndex(
					(col) => col.toLowerCase().includes("pos_moins") || col.toLowerCase().includes("moins"),
				);
				const posPlusCherIndex = allColumnNames.findIndex(
					(col) => col.toLowerCase().includes("pos_plus") || col.toLowerCase().includes("plus"),
				);
				const visibleColumnNames = allColumnNames.filter(
					(_, idx) => idx !== posMoinsDisantIndex && idx !== posPlusCherIndex,
				);
				const displayColumnNames = visibleColumnNames.map((col) => {
					const fournisseur = fournisseurs.find(
						(f) => asString((f as unknown as Record<string, unknown>).CT_Num) === col,
					);
					if (fournisseur) {
						const ctIntitule = asString((fournisseur as unknown as Record<string, unknown>).CT_Intitule);
						return `${col} | ${ctIntitule}`;
					}
					return col;
				});
				const dataRowsWithMetadata = compRows.slice(1).map((row) => {
					const obj: Record<string, unknown> = {};
					visibleColumnNames.forEach((col) => {
						const originalIndex = allColumnNames.indexOf(col);
						obj[col] = row[originalIndex];
					});
					if (posMoinsDisantIndex !== -1) obj._posMoinsDisant = asNumber(row[posMoinsDisantIndex]);
					if (posPlusCherIndex !== -1) obj._posPlusCher = asNumber(row[posPlusCherIndex]);
					return obj;
				});
				setComparatifVisibleKeys(visibleColumnNames);
				setComparatifColumns(displayColumnNames);
				setComparatifRows(dataRowsWithMetadata);
			} else {
				setComparatifVisibleKeys([]);
				setComparatifColumns([]);
				setComparatifRows([]);
			}

			// Lignes retour par article
			const articleList = Array.isArray(a) ? a : [];
			const retourMap: Record<number, Record<string, unknown>[]> = {};
			await Promise.all(
				articleList.map(async (article) => {
					const ar = article as Record<string, unknown>;
					const baNo = asNumber(ar.BA_No ?? ar.bA_No);
					if (!baNo) return;
					const retourData = await getLignePieceParBesoinArticleRetour(besoinId, baNo, false);
					retourMap[baNo] = Array.isArray(asRecord(retourData).data)
						? (asRecord(retourData).data as Record<string, unknown>[])
						: [];
				}),
			);
			setRetourRowsByArticle(retourMap);

			// EtatViewRetour
			const demandeDetails = asRecord(getAny(dR, "demande", "Demande"));
			const _etatAff = asNumber(getAny(demandeDetails, "B_Etat_Affectation_Acheteur", "b_Etat_Affectation_Acheteur"));
			const _etatRetour = asNumber(getAny(demandeDetails, "B_EtatRetour", "b_EtatRetour"));
			const _vAcheteur = asBool(getAny(dR, "v_Acheteur", "V_Acheteur"));
			const clotureFromDetails = getAny(
				dR,
				"verifier_Demande_Totalement_Cloturer",
				"Verifier_Demande_Totalement_Cloturer",
				"verifierDemandeTotalementCloturer",
				"VerifierDemandeTotalementCloturer",
			);
			if (_etatAff !== ETAT_ACHETER && _etatRetour === 0 && _vAcheteur) {
				try {
					const cloturer =
						clotureFromDetails === undefined
							? await verifierDemandeCloturer(besoinId, actualTpNo)
							: asBool(clotureFromDetails);
					if (asBool(cloturer) && _etatAff !== 0) {
						const affichier = await affichieraffectionDemande(
							besoinId,
							asNumber(getAny(bR, "BT_Id", "bT_Id")),
							actualTpNo,
						);
						setShowValidationRetour(asBool(affichier));
					} else {
						setShowValidationRetour(false);
					}
				} catch { setShowValidationRetour(false); }
			} else {
				setShowValidationRetour(false);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur de chargement.");
		} finally {
			setLoading(false);
		}
	}, [besoinId, actualTpNo]);

	useEffect(() => { void loadAll(); }, [loadAll]);

	// ── Actions ────────────────────────────────────────────────────────────────

	const resetForm = useCallback(() => {
		setForm({
			aD_No: 0, bA_No: 0,
			aD_TypeAffectation: TypeAffectation.Fournisseur,
			eP_Tiers: "",
			aD_NoDocument_Affectation: 0,
			aD_NoOrigine: 0, aD_NoListDoc: 0, listLignePiece: 0,
		});
	}, []);

	const onFournisseurPrincipal = useCallback(async (baNo: number): Promise<void> => {
		if (!baNo) return;
		try {
			const res = await getFournisseurPrincipal(baNo);
			const ctNum = getTiersNum(res);
			if (ctNum) setForm((p) => ({ ...p, eP_Tiers: ctNum }));
		} catch { /* silencieux */ }
	}, []);

	const onTypeAffectationChange = useCallback(
		async (val: number): Promise<void> => {
			setForm((p) => ({ ...p, aD_TypeAffectation: val }));
			if (val === TypeAffectation.Fournisseur) await onFournisseurPrincipal(form.bA_No);
		},
		[form.bA_No, onFournisseurPrincipal],
	);

	const onArticleChange = useCallback(
		async (baNo: number): Promise<void> => {
			setForm((p) => ({ ...p, bA_No: baNo }));
			if (form.aD_TypeAffectation === TypeAffectation.Fournisseur) await onFournisseurPrincipal(baNo);
		},
		[form.aD_TypeAffectation, onFournisseurPrincipal],
	);

	const onSaveAffectation = async (): Promise<void> => {
		if (!isRetourSansPartiel && !form.bA_No) { toast.error("Choix article est obligatoire"); return; }
		if (!isRetourSansPartiel && !form.aD_TypeAffectation) { toast.error("Choix type d'affectation est obligatoire"); return; }
		if (!isRetourSansPartiel && form.aD_TypeAffectation === TypeAffectation.Fournisseur && !form.eP_Tiers) {
			toast.error("Choix fournisseur est obligatoire"); return;
		}
		if (!isRetourSansPartiel && form.aD_TypeAffectation === TypeAffectation.Document && !form.aD_NoDocument_Affectation) {
			toast.error("Choix document est obligatoire"); return;
		}
		setSaving(true);
		try {
			if (isRetourSansPartiel) {
				await addAffectation({
					AD_No: form.aD_No || 0, B_No: besoinId, BA_No: form.bA_No,
					AD_TypeAffectation: form.aD_NoListDoc ? TypeAffectation.Document : form.aD_TypeAffectation,
					EP_Tiers: form.eP_Tiers || undefined,
					AD_NoDocument_Affectation: form.aD_NoListDoc || undefined,
					AD_NoOrigine: form.aD_NoOrigine || undefined,
					AD_ArticleRetour: true, TP_No: TypeSage.BC_Achat,
					AD_TypeDemande: Type_Validation.Retour_Demande_Validation,
					AD_Etat: Etat_Affection_Demande.A_Acheter, AD_EtatRetour: EtatRetour.Valider,
				});
			} else {
				await addAffectation({
					AD_No: form.aD_No || 0, B_No: besoinId, BA_No: form.bA_No,
					AD_TypeAffectation: form.aD_TypeAffectation,
					EP_Tiers: form.eP_Tiers || undefined,
					AD_NoDocument_Affectation: form.aD_NoDocument_Affectation || undefined,
					TP_No: actualTpNo,
					...(actualTpNo === TypeSage.BC_Achat ? { AD_Etat: Etat_Affection_Demande.A_Acheter } : {}),
				});
			}
			toast.success("Affectation enregistrée.");
			resetForm();
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur d'enregistrement.");
		} finally { setSaving(false); }
	};

	const onDeleteAffectation = async (): Promise<void> => {
		if (!form.aD_No) { toast.error("Aucune ligne sélectionnée"); return; }
		try {
			await deleteAffectation(form.aD_No, besoinId);
			toast.success("Affectation supprimée.");
			resetForm();
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur de suppression.");
		}
	};

	const onAnnuler = async (): Promise<void> => {
		if (affectations.length === 0) { onBack(); return; }
		try {
			await deleteAffectation(0, besoinId);
			toast.success("Demande clôturée avec succès.");
			if (vId === 0) onBack();
			else window.location.href = `/Besoin/Validation_Demande?id=${vId}&b_No=${besoinId}`;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de la clôture de la demande.");
		}
	};

	const onGenererSelonFournisseur = async (): Promise<void> => {
		const rep = await getArticlesSansFournisseur(besoinId, true);
		const rr = asRecord(rep);
		if (asString(rr.messageArticle)) { toast.error(`Articles sans fournisseur: ${asString(rr.messageArticle)}`); return; }
		try {
			await genererAffectationFournisseur(besoinId, actualTpNo);
			toast.success("Affectations générées.");
			resetForm();
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de la génération.");
		}
	};

	const onValider = async (): Promise<void> => {
		const rep = await getArticlesSansFournisseur(besoinId, false);
		const rr = asRecord(rep);
		if (asString(rr.messageArticle)) { toast.error(`Articles invalides: ${asString(rr.messageArticle)}`); return; }
		setGenerating(true);
		try {
			const typeV = isRetourDemande ? Type_Validation.Retour_Demande_Validation : Type_Validation.Demande_Besoin;
			await genererDocument(besoinId, actualTpNo, typeV);
			toast.success("Validation terminée.");
			if (isRetourDemande) window.location.href = "/documents?tpNo=12";
			else onBack();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur pendant la validation.");
		} finally { setGenerating(false); }
	};

	const onValiderSelectionRetour = async (): Promise<void> => {
		try {
			const rows = vAcheteur ? Object.values(selectedRetourRows) : Object.values(retourRowsByArticle).flat();
			if (rows.length === 0) { toast.error("Aucun article à affecter."); return; }
			const aD_EtatRetour = vAcheteur ? EtatRetour.Valider : EtatRetour.Attente_Validation_acheteur;
			await addOrUpdateRetourBesoin(rows, aD_EtatRetour);
			toast.success("Validation retour enregistrée.");
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur.");
		}
	};

	const onAnnulerRetour = async (): Promise<void> => {
		const selected = Object.values(selectedRetourRows)[0];
		if (!selected) { toast.error("Sélectionnez une ligne à annuler."); return; }
		const motif = window.prompt("Motif d'annulation");
		if (!motif?.trim()) return;
		try {
			await rejetArticleRetourDemande({
				v_Id: vId,
				AD_No: asNumber(selected.AD_No ?? selected.aD_No),
				Motif: motif, B_No: besoinId, MR_No: 0,
			});
			toast.success("Article retour annulé.");
			setSelectedRetourRows({});
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur d'annulation.");
		}
	};

	// ── Loading ────────────────────────────────────────────────────────────────

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<Box sx={{ width: "100%", minWidth: 0 }}>

			{/* ══ BARRE D'ACTIONS (style MVC : état à gauche, boutons à droite) ══ */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 1,
					mb: 2,
					mt: 1,
				}}
			>
				{/* État + retour */}
				<Stack direction="row" spacing={1} alignItems="center">
					<Button variant="outlined" size="small" onClick={onBack} sx={{ mr: 1 }}>
						Retour
					</Button>
					<EtatChip etat={etatAffectation} />
				</Stack>

				{/* Boutons d'action à droite — ordre MVC */}
				<Stack direction="row" spacing={1} flexWrap="wrap">
					{showBtnAnnuler && (
						<Button
							variant="contained"
							size="small"
							color="error"
							onClick={() => void onAnnuler()}
							startIcon={<span style={{ fontSize: 12 }}>✕</span>}
						>
							Annuler la demande
						</Button>
					)}
					{showBtnGenerer && (
						<Button
							variant="contained"
							size="small"
							color="primary"
							disabled={formDisabled}
							onClick={() => void onGenererSelonFournisseur()}
							startIcon={<span style={{ fontSize: 12 }}>✓</span>}
						>
							Générer selon fournisseur affecté
						</Button>
					)}
					{showBtnValider && (
						<Button
							variant="contained"
							size="small"
							color="success"
							disabled={generating}
							onClick={() => void onValider()}
							startIcon={<span style={{ fontSize: 12 }}>✓</span>}
						>
							Valider
						</Button>
					)}
					{showBtnCommande && (
						<Button
							variant="contained"
							size="small"
							color="success"
							onClick={() => void onValiderSelectionRetour()}
						>
							Bon de commande
						</Button>
					)}
					<Button
						variant="contained"
						size="small"
						sx={{ bgcolor: "#343a40", "&:hover": { bgcolor: "#23272b" } }}
						onClick={onBack}
						startIcon={<span style={{ fontSize: 12 }}>✕</span>}
					>
						Fermer
					</Button>
				</Stack>
			</Box>

			{lieeDemandeGenerer && (
				<Alert severity="info" sx={{ mb: 2 }}>
					Des documents sont déjà générés pour cette demande. La table d'affectation reste consultable.
				</Alert>
			)}

			{/* ══ INFORMATIONS GÉNÉRALES (style MVC : inputs read-only en grille) ══ */}
			<Accordion defaultExpanded disableGutters elevation={0}
				sx={{ border: "1px solid #dee2e6", borderRadius: "4px !important", mb: 2, "&:before": { display: "none" } }}
			>
				<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#1994cb" }} />} sx={{ px: 2, py: 0, minHeight: 40 }}>
					<SectionHeader title="Informations Générales" />
				</AccordionSummary>
				<AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>
					{/* Ligne 1 : N° demande | Titre | Date */}
					<Grid container spacing={2} sx={{ mb: 1.5 }}>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>N° demande</Typography>
							<Box sx={{ ...readonlyInputSx, color: "#0d6efd" /* bleu lien MVC */ }}>
								{bNumero || "—"}
							</Box>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Titre</Typography>
							<Box sx={readonlyInputSx}>{bTitre || "—"}</Box>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Date</Typography>
							<Box sx={readonlyInputSx}>{bDate || "—"}</Box>
						</Grid>
					</Grid>
					{/* Ligne 2 : Affaire | Dépôt | Date livraison */}
					<Grid container spacing={2} sx={{ mb: 1.5 }}>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Affaire</Typography>
							<Box sx={readonlyInputSx}>{bAffaire || "—"}</Box>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Dépôt</Typography>
							<Box sx={readonlyInputSx}>{bDepot || "—"}</Box>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Date livraison</Typography>
							<Box sx={readonlyInputSx}>{bDateLivraison || "—"}</Box>
						</Grid>
					</Grid>
					{/* Ligne 3 : Demandeur | Degré d'importance | Type document */}
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Demandeur</Typography>
							<Box sx={readonlyInputSx}>{bDemandeur || "—"}</Box>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Degré d'importance</Typography>
							<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minHeight: 31 }}>
								<Box sx={{ flex: 1, height: 6, bgcolor: "#e9ecef", borderRadius: 3, position: "relative" }}>
									<Box
										sx={{
											position: "absolute", left: 0, top: 0, height: "100%",
											width: `${Math.max(5, bDegreImportance * 20)}%`,
											bgcolor: "primary.main", borderRadius: 3,
										}}
									/>
								</Box>
								<Typography sx={{ fontSize: "0.8125rem", color: "text.secondary", whiteSpace: "nowrap" }}>
									{importanceLabels[bDegreImportance] || "—"}
								</Typography>
							</Box>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Typography sx={labelSx}>Type document</Typography>
							<Box sx={readonlyInputSx}>{typeDocLabel}</Box>
						</Grid>
					</Grid>
				</AccordionDetails>
			</Accordion>

			{/* ══ VALIDATION RETOUR ══ */}
			{showValidationRetour && (
				<Accordion defaultExpanded disableGutters elevation={0}
					sx={{ border: "1px solid #dee2e6", borderRadius: "4px !important", mb: 2, "&:before": { display: "none" } }}
				>
					<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#1994cb" }} />} sx={{ px: 2, py: 0, minHeight: 40 }}>
						<SectionHeader title="Validation" />
					</AccordionSummary>
					<AccordionDetails sx={{ p: 2 }}>
						<Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1.5 }}>
							<Button variant="outlined" color="error" size="small" onClick={() => void onAnnulerRetour()}>
								Annuler retour
							</Button>
							<Button variant="contained" color="success" size="small" onClick={() => void onValiderSelectionRetour()}>
								Valider sélection
							</Button>
						</Stack>
						{articles.map((article, articleIdx) => {
							const a = article as Record<string, unknown>;
							const baNo = asNumber(a.BA_No ?? a.bA_No);
							const ref = asString(a.BA_RefArticle ?? a.bA_RefArticle);
							const rows = retourRowsByArticle[baNo] ?? [];
							return (
								<Accordion key={baNo || articleIdx} defaultExpanded disableGutters>
									<AccordionSummary expandIcon={<ExpandMoreIcon />}>
										<Typography variant="body1">Article : {ref || `#${baNo}`}</Typography>
									</AccordionSummary>
									<AccordionDetails>
										<TableContainer component={Paper} variant="outlined">
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell /><TableCell>Fournisseur</TableCell>
														<TableCell>Article</TableCell>
														<TableCell align="right">Qté demandée</TableCell>
														<TableCell align="right">Qté</TableCell>
														<TableCell>N° doc. généré</TableCell>
														<TableCell align="center">Pièces jointes</TableCell>
														<TableCell>État retour</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{rows.length === 0 && (
														<TableRow><TableCell colSpan={8} align="center">Aucune ligne</TableCell></TableRow>
													)}
													{rows.map((row, rowIdx) => {
														const adNo = asNumber(row.AD_No ?? row.aD_No);
														const isSelected = asNumber(selectedRetourRows[baNo]?.AD_No ?? selectedRetourRows[baNo]?.aD_No) === adNo;
														const hasAttachments = asNumber(row.LP_NbAttachement ?? row.lP_NbAttachement) > 0;
														const hasRejet = asString(row.AD_Motif ?? row.aD_Motif) && asNumber(row.AD_IDValidateurRejetArticle ?? row.aD_IDValidateurRejetArticle);
														return (
															<>
																<TableRow key={adNo || rowIdx} selected={isSelected}>
																	<TableCell padding="checkbox">
																		<IconButton size="small" onClick={() =>
																			setSelectedRetourRows((prev) => ({
																				...prev,
																				[baNo]: isSelected ? ({} as Record<string, unknown>) : row,
																			}))
																		}>
																			{isSelected ? "●" : "○"}
																		</IconButton>
																	</TableCell>
																	<TableCell>{asString(row.AD_Fournisseur ?? row.aD_Fournisseur)}</TableCell>
																	<TableCell>{asString(row.AR_Article ?? row.aR_Article)}</TableCell>
																	<TableCell align="right">{toFixedIfNumber(row.AR_QteDemande ?? row.aR_QteDemande)}</TableCell>
																	<TableCell align="right">{toFixedIfNumber(row.LP_QteMvt ?? row.lP_QteMvt)}</TableCell>
																	<TableCell>{asString(row.LP_NumDocument_Generer ?? row.lP_NumDocument_Generer)}</TableCell>
																	<TableCell align="center">
																		{hasAttachments && (
																			<IconButton size="small" color="info" title="Pièces jointes"
																				onClick={(e) => { e.stopPropagation(); toast.info("Pièces jointes : Fonctionnalité à implémenter"); }}>
																				<AttachFileIcon fontSize="small" />
																			</IconButton>
																		)}
																	</TableCell>
																	<TableCell><EtatRetourChip etat={asNumber(row.AD_EtatRetour ?? row.aD_EtatRetour)} /></TableCell>
																</TableRow>
																{hasRejet && (
																	<TableRow>
																		<TableCell colSpan={8}>
																			<Alert severity="error" sx={{ mt: 1, mb: 1 }}>
																				<strong>Article rejeté par :</strong>{" "}
																				{asString(row.AD_NomValidateurRejetArticle ?? row.aD_NomValidateurRejetArticle)}
																				<br />
																				<strong>Motif :</strong> {asString(row.AD_Motif ?? row.aD_Motif)}
																			</Alert>
																		</TableCell>
																	</TableRow>
																)}
															</>
														);
													})}
												</TableBody>
											</Table>
										</TableContainer>
									</AccordionDetails>
								</Accordion>
							);
						})}
					</AccordionDetails>
				</Accordion>
			)}

			{/* ══ LISTE DES ARTICLES / AFFECTATION (style MVC) ══ */}
			{showDivDemande && (
				<Accordion defaultExpanded disableGutters elevation={0}
					sx={{ border: "1px solid #dee2e6", borderRadius: "4px !important", mb: 2, "&:before": { display: "none" } }}
				>
					<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#1994cb" }} />} sx={{ px: 2, py: 0, minHeight: 40 }}>
						<SectionHeader title="Liste des articles associés à la demande" />
					</AccordionSummary>
					<AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>

						{/* ── Filtres : mode normal (non retour-sans-partiel) ── */}
						{!isRetourSansPartiel && (
							<Grid container spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
								{/* Article */}
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography sx={labelSx}>Article</Typography>
									<FormControl size="small" fullWidth>
										<Select
											value={form.bA_No}
											disabled={formDisabled}
											displayEmpty
											onChange={(e) => void onArticleChange(Number(e.target.value))}
										>
											<MenuItem value={0}>Toutes les articles</MenuItem>
											{articles.map((a, aIdx) => {
												const ar = a as Record<string, unknown>;
												const id = asNumber(ar.BA_No ?? ar.bA_No);
												const lbl = asString(ar.BA_DesigArticle ?? ar.bA_DesigArticle);
												return <MenuItem key={id || aIdx} value={id}>{lbl || `Article ${id}`}</MenuItem>;
											})}
										</Select>
									</FormControl>
								</Grid>

								{/* Type */}
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography sx={labelSx}>Type</Typography>
									<FormControl size="small" fullWidth>
										<Select
											value={form.aD_TypeAffectation}
											disabled={formDisabled}
											onChange={(e) => void onTypeAffectationChange(Number(e.target.value))}
										>
											<MenuItem value={TypeAffectation.Fournisseur}>Fournisseur</MenuItem>
											<MenuItem value={TypeAffectation.Document}>Document</MenuItem>
										</Select>
									</FormControl>
								</Grid>

								{/* Fournisseur (si type = fournisseur) */}
								{showFournisseur && (
									<Grid size={{ xs: 12, sm: 4 }}>
										<Typography sx={labelSx}>Fournisseur</Typography>
										<FormControl size="small" fullWidth>
											<Select
												value={form.eP_Tiers}
												disabled={formDisabled}
												displayEmpty
												onChange={(e) => setForm((p) => ({ ...p, eP_Tiers: String(e.target.value) }))}
											>
												<MenuItem value="">Choisir</MenuItem>
												{fournisseurOptions.map((f) => (
													<MenuItem key={f.value} value={f.value}>{f.text}</MenuItem>
												))}
											</Select>
										</FormControl>
									</Grid>
								)}

								{/* Document (si type = document) */}
								{showDocument && (
									<Grid size={{ xs: 12, sm: 4 }}>
										<Typography sx={labelSx}>Document</Typography>
										<Stack direction="row" spacing={0.5} alignItems="center">
											<FormControl size="small" fullWidth>
												<Select
													value={form.aD_NoDocument_Affectation}
													disabled={formDisabled}
													displayEmpty
													onChange={(e) => setForm((p) => ({ ...p, aD_NoDocument_Affectation: Number(e.target.value) }))}
												>
													<MenuItem value={0}>Choisir</MenuItem>
													{docs.map((d) => (
														<MenuItem key={d.value} value={Number(d.value)}>{d.text}</MenuItem>
													))}
												</Select>
											</FormControl>
											{canConsultDocument && (
												<IconButton size="small" color="info"
													disabled={!form.aD_NoDocument_Affectation}
													onClick={() => {
														if (form.aD_NoDocument_Affectation)
															window.open(`/Document/DetailsDocument?lP_No=${form.aD_NoDocument_Affectation}`, "_blank");
													}}
												>
													<OpenInNewIcon fontSize="small" />
												</IconButton>
											)}
										</Stack>
									</Grid>
								)}

								{/* ListLignePiece : MVC cache ce select en mode normal
								 * (.ListLignePiece hide dans le else de changerEtatAffectation)
								 * Il est visible UNIQUEMENT en mode retour-sans-partiel (bloc ci-dessous) */}
							</Grid>
						)}

						{/* ── Filtres : mode retour sans partiel ── */}
						{isRetourSansPartiel && (
							<Grid container spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography sx={labelSx}>Ligne de pièce (origine)</Typography>
									<FormControl size="small" fullWidth>
										<Select value={form.aD_NoOrigine} disabled={formDisabled} displayEmpty
											onChange={async (e) => {
												const adNo = Number(e.target.value);
												setForm((p) => ({ ...p, aD_NoOrigine: adNo }));
												await loadDocsForAffectation(adNo);
											}}
										>
											<MenuItem value={0}>Choisir</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid size={{ xs: 12, sm: 4 }}>
									<Typography sx={labelSx}>Document</Typography>
									<FormControl size="small" fullWidth>
										<Select value={form.aD_NoListDoc} disabled={formDisabled || docs.length === 0} displayEmpty
											onChange={(e) => setForm((p) => ({ ...p, aD_NoListDoc: Number(e.target.value) }))}
										>
											<MenuItem value={0}>Choisir</MenuItem>
											{docs.map((d) => <MenuItem key={d.value} value={Number(d.value)}>{d.text}</MenuItem>)}
										</Select>
									</FormControl>
								</Grid>
							</Grid>
						)}

						{/* ── Récap d'affectations : titre + boutons CRUD à droite (identique MVC) ── */}
						<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
							<Typography sx={{ color: "#0286c1", fontWeight: 600, fontSize: "1rem" }}>
								Récap d'affectations
							</Typography>
							<Stack direction="row" spacing={1}>
								{showBtnNouveau && (
									<Button variant="contained" size="small" color="success" onClick={resetForm}
										startIcon={<span style={{ fontSize: 14 }}>+</span>}>
										Nouveau
									</Button>
								)}
								{showBtnSupprimer && (
									<Button variant="contained" size="small" color="error"
										disabled={formDisabled}
										onClick={() => void onDeleteAffectation()}
										startIcon={<span>🗑</span>}>
										Supprimer
									</Button>
								)}
								{showBtnEnregistrer && (
									<Button variant="contained" size="small" color="primary"
										disabled={saving || formDisabled}
										onClick={() => void onSaveAffectation()}
										startIcon={<span style={{ fontSize: 12 }}>✓</span>}>
										Enregistrer
									</Button>
								)}
							</Stack>
						</Box>

						{/* Tableau affectations */}
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow sx={{ bgcolor: "#f8f9fa" }}>
										<TableCell sx={{ fontWeight: 600 }}>Fournisseur</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Document</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Article</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600 }}>Qté</TableCell>
										{showColonnesDocument && (
											<>
												<TableCell align="right" sx={{ fontWeight: 600 }}>Qté demandée</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>N° doc. générée</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>Prix unitaire</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Remise</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>Montant HT</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600 }}>Montant TTC</TableCell>
												<TableCell align="center" sx={{ fontWeight: 600 }}>État</TableCell>
											</>
										)}
										<TableCell align="center" sx={{ fontWeight: 600, width: 52, px: 0.5 }}>Ouvrir</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{affectations.length === 0 && (
										<TableRow>
											<TableCell colSpan={showColonnesDocument ? 12 : 5} align="center" sx={{ color: "text.secondary" }}>
												Aucun Enregistrement Trouvé
											</TableCell>
										</TableRow>
									)}
									{affectations.map((row, affIdx) => {
										const r = row as Record<string, unknown>;
										const adNo = asNumber(r.AD_No ?? r.aD_No);
										const isSelected = form.aD_No === adNo && adNo !== 0;
										return (
											<TableRow key={adNo || affIdx} hover selected={isSelected}
												sx={{ cursor: "pointer" }}
												onClick={() => {
													if (isSelected) { resetForm(); }
													else {
														setForm({
															aD_No: adNo,
															bA_No: asNumber(r.BA_No ?? r.bA_No),
															aD_TypeAffectation: asNumber(r.AD_TypeAffectation ?? r.aD_TypeAffectation) || 1,
															eP_Tiers: asString(r.EP_Tiers ?? r.eP_Tiers ?? r.CT_Num ?? r.cT_Num ?? r.ct_Num),
															aD_NoDocument_Affectation: asNumber(r.AD_NoDocument_Affectation ?? r.aD_NoDocument_Affectation),
															aD_NoOrigine: asNumber(r.AD_NoOrigine ?? r.aD_NoOrigine),
															aD_NoListDoc: asNumber(r.AD_NoDocument_Affectation ?? r.aD_NoDocument_Affectation),
															listLignePiece: adNo,
														});
														void loadDocsForAffectation(adNo);
													}
												}}
											>
												<TableCell>{asString(r.AD_Fournisseur ?? r.aD_Fournisseur)}</TableCell>
												<TableCell>{asString(r.AD_Document ?? r.aD_Document)}</TableCell>
												<TableCell>{asString(r.AR_Article ?? r.aR_Article)}</TableCell>
												<TableCell align="right">{toFixedIfNumber(r.LP_QteMvt ?? r.lP_QteMvt)}</TableCell>
												{showColonnesDocument && (
													<>
														<TableCell align="right">{toFixedIfNumber(r.AR_QteDemande ?? r.aR_QteDemande)}</TableCell>
														<TableCell>{asString(r.LP_NumDocument_Generer ?? r.lP_NumDocument_Generer)}</TableCell>
														<TableCell align="right">{toFixedIfNumber(r.LP_PrixUnitaire ?? r.lP_PrixUnitaire)}</TableCell>
														<TableCell>{asString(r.LP_Remise ?? r.lP_Remise)}</TableCell>
														<TableCell align="right">{toFixedIfNumber(r.LP_MontantHT ?? r.lP_MontantHT)}</TableCell>
														<TableCell align="right">{toFixedIfNumber(r.LP_MontantTTC ?? r.lP_MontantTTC)}</TableCell>
														<TableCell align="center">
															{asNumber(r.EP_ValiderAERP ?? r.eP_ValiderAERP) === 8
																? <LockOpenIcon fontSize="small" />
																: <LockIcon fontSize="small" />}
														</TableCell>
													</>
												)}
												<TableCell align="center" sx={{ width: 52, px: 0.5 }}>
													{(() => {
														const lpNo      = asNumber(r.LP_No ?? r.lP_No);
														const docNumero = asString(r.LP_NumDocument_Generer ?? r.lP_NumDocument_Generer);
														const tpNoVal   = asNumber(r.TP_No ?? r.tP_No) || actualTpNo;

														if (lpNo === 0 || !docNumero) return null;

														return (
															<Tooltip title={`Ouvrir : ${docNumero}`} placement="top" arrow>
																<IconButton
																	size="small"
																	color="primary"
																	onClick={(e) => {
																		e.stopPropagation();
																		window.open(
																			`/document/details?epNumero=${encodeURIComponent(docNumero)}&tpNo=${tpNoVal}`,
																			"_blank",
																		);
																	}}
																	sx={{
																		bgcolor: "#e3f2fd",
																		"&:hover": { bgcolor: "#bbdefb" },
																	}}
																>
																	<OpenInNewIcon sx={{ fontSize: 15 }} />
																</IconButton>
															</Tooltip>
														);
													})()}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</AccordionDetails>
				</Accordion>
			)}

			{/* ══ TABLEAUX COMPARATIFS ══ */}
			{(lieeDemandeGenerer || showHistorique) && (
				<Accordion defaultExpanded disableGutters elevation={0}
					sx={{ border: "1px solid #dee2e6", borderRadius: "4px !important", mb: 2, "&:before": { display: "none" } }}
				>
					<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#1994cb" }} />} sx={{ px: 2, py: 0, minHeight: 40 }}>
						<SectionHeader title="Tableaux Comparatif" />
					</AccordionSummary>
					<AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
							<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Détails des prix</Typography>
							<Button variant="contained" size="small"
								onClick={() => void exportTableauxComparatifsExcel(besoinId, bNumero)}
								startIcon={<OpenInNewIcon />}
							>
								Exporter
							</Button>
						</Stack>

						{comparatifRows.length === 0 ? (
							<Alert severity="info" sx={{ borderRadius: 1 }}>
								Aucun tableau comparatif disponible.
							</Alert>
						) : (
							<>
								<TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1, mb: 1.5 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												{comparatifColumns.map((c, idx) => (
													<TableCell key={c} sx={{
														fontWeight: 600, fontSize: "0.75rem",
														textAlign: idx === 0 ? "left" : "right",
														bgcolor: "#f5f5f5",
													}}>
														{c}
													</TableCell>
												))}
											</TableRow>
										</TableHead>
										<TableBody>
											{comparatifRows.map((r, rIdx) => {
												const posMoinsDisant = asNumber(r._posMoinsDisant);
												const posPlusCher = asNumber(r._posPlusCher);
												return (
													<TableRow key={rIdx} hover sx={{ "&:nth-of-type(odd)": { bgcolor: "#fafafa" } }}>
														{comparatifVisibleKeys.map((key, cIdx) => {
															const value = asString(r[key]);
															let bgColor = "inherit";
															if (cIdx > 0) {
																if (posMoinsDisant !== -1 && cIdx === posMoinsDisant - 1) {
																	bgColor = "#a5d6a7";
																} else if (posPlusCher !== -1 && cIdx === posPlusCher - 1) {
																	bgColor = "#ef9a9a";
																}
															}
															return (
																<TableCell key={key} sx={{
																	bgcolor: bgColor,
																	textAlign: cIdx === 0 ? "left" : "right",
																	fontWeight: cIdx === 0 ? 500 : "normal",
																	fontSize: "0.8125rem",
																}}>
																	{value}
																</TableCell>
															);
														})}
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</TableContainer>

								{/* Légende */}
								<Stack direction="row" spacing={1}>
									<Chip label="Moins-disant"
										sx={{ bgcolor: "#a5d6a7", color: "#1b5e20", fontWeight: 500, fontSize: "0.75rem", borderRadius: 0 }}
									/>
									<Chip label="Plus-cher"
										sx={{ bgcolor: "#ef9a9a", color: "#b71c1c", fontWeight: 500, fontSize: "0.75rem", borderRadius: 0 }}
									/>
								</Stack>
							</>
						)}
					</AccordionDetails>
				</Accordion>
			)}

			{/* ══ HISTORIQUE VALIDATION ══ */}
			{showHistorique && (
				<Accordion defaultExpanded disableGutters elevation={0}
					sx={{ border: "1px solid #dee2e6", borderRadius: "4px !important", mb: 2, "&:before": { display: "none" } }}
				>
					<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#1994cb" }} />} sx={{ px: 2, py: 0, minHeight: 40 }}>
						<SectionHeader title="Historique validation de demande" />
					</AccordionSummary>
					<AccordionDetails sx={{ px: 2, pb: 2, pt: 1 }}>
						{/* Filtres */}
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 2 }}>
							<FormControl size="small" sx={{ minWidth: 170 }}>
								<InputLabel>Type</InputLabel>
								<Select label="Type" value={historiqueFilter.V_Type}
									onChange={(e) => setHistoriqueFilter((p) => ({ ...p, V_Type: Number(e.target.value) as Type_Validation }))}
								>
									<MenuItem value={Type_Validation.Demande_Besoin}>Demande de besoin</MenuItem>
									<MenuItem value={Type_Validation.Retour_Demande_Validation}>Retour de demande</MenuItem>
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 160 }}>
								<InputLabel>Statut</InputLabel>
								<Select label="Statut" value={historiqueFilter.V_Status}
									onChange={(e) => setHistoriqueFilter((p) => ({ ...p, V_Status: Number(e.target.value) }))}
								>
									<MenuItem key="statut-all" value={-1}>Tous</MenuItem>
									<MenuItem key="statut-0" value={0}>En attente</MenuItem>
									<MenuItem key="statut-1" value={1}>Rejeté</MenuItem>
									<MenuItem key="statut-3" value={3}>Validé</MenuItem>
									<MenuItem key="statut-4" value={4}>Attente d'achat</MenuItem>
									<MenuItem key="statut-5" value={5}>Achetée</MenuItem>
									<MenuItem key="statut-6" value={6}>Rectification</MenuItem>
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 180 }}>
								<InputLabel>Rôle</InputLabel>
								<Select label="Rôle" value={historiqueFilter.V_Role_Validateur}
									onChange={(e) => setHistoriqueFilter((p) => ({ ...p, V_Role_Validateur: Number(e.target.value) }))}
								>
									<MenuItem key="role-all" value={-1}>Tous</MenuItem>
									<MenuItem key="role-1" value={1}>Demandeur</MenuItem>
									<MenuItem key="role-2" value={2}>Responsable hiérarchique</MenuItem>
									<MenuItem key="role-3" value={3}>Validateur</MenuItem>
									<MenuItem key="role-4" value={4}>Acheteur</MenuItem>
								</Select>
							</FormControl>
							<Button variant="outlined" size="small" onClick={() => void loadAll()}>Filtrer</Button>
						</Box>

						{/* Tableau historique */}
						<TableContainer component={Paper} variant="outlined">
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow>
										{["Intitulé", "Rôle", "Date notification", "Date validation", "Statut", "Type", "Motif"].map((h) => (
											<TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
										))}
									</TableRow>
								</TableHead>
								<TableBody>
									{historiqueRows.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
												Aucun enregistrement trouvé.
											</TableCell>
										</TableRow>
									) : (
										historiqueRows.map((row, hIdx) => {
											const status = asNumber(row.V_Status ?? row.v_Status);
											const role = asNumber(row.V_Role_Validateur ?? row.v_Role_Validateur);
											const type = asNumber(row.V_Type ?? row.v_Type);
											const motif = asString(row.V_Motif ?? row.v_Motif);
											const notifDate = asString(row.NU_DateTime ?? row.nU_DateTime);
											const valDate = asString(row.V_ValidationDate ?? row.v_ValidationDate);

											const STATUT_CHIP: Record<number, { label: string; bg: string; color: string }> = {
												0: { label: "En attente", bg: "#6c757d", color: "#fff" },
												1: { label: "Rejeté", bg: "#dc3545", color: "#fff" },
												2: { label: "Partiel", bg: "#17a2b8", color: "#fff" },
												3: { label: "Validé", bg: "#28a745", color: "#fff" },
												4: { label: "Attente d'achat", bg: "#ffc107", color: "#000" },
												5: { label: "Achetée", bg: "#007bff", color: "#fff" },
												6: { label: "Rectification", bg: "#dc3545", color: "#fff" },
											};
											const ROLE_CHIP: Record<number, { label: string; bg: string }> = {
												1: { label: "Demandeur", bg: "#6c757d" },
												2: { label: "Responsable hiérarchique", bg: "#17a2b8" },
												3: { label: "Validateur", bg: "#28a745" },
												4: { label: "Acheteur", bg: "#007bff" },
											};
											const TYPE_CHIP: Record<number, { label: string; bg: string; color: string }> = {
												0: { label: "Demande besoin", bg: "#17a2b8", color: "#fff" },
												1: { label: "Retour demande", bg: "#ffc107", color: "#000" },
											};
											const sc = STATUT_CHIP[status];
											const rc = ROLE_CHIP[role];
											const tc = TYPE_CHIP[type];
											const fmtDate = (raw: string) => {
												if (!raw) return "—";
												const d = new Date(raw);
												return Number.isNaN(d.getTime()) ? raw : d.toLocaleString("fr-FR", {
													day: "2-digit", month: "2-digit", year: "numeric",
													hour: "2-digit", minute: "2-digit",
												});
											};
											return (
												<TableRow key={hIdx} hover>
													<TableCell sx={{ fontWeight: 500 }}>
														{asString(row.US_UserIntitule ?? row.uS_UserIntitule) || "—"}
													</TableCell>
													<TableCell>
														{rc ? <Chip label={rc.label} size="small"
															sx={{ bgcolor: rc.bg, color: "#fff", fontWeight: 600, fontSize: 11 }} /> : "—"}
													</TableCell>
													<TableCell sx={{ fontSize: 12 }}>{fmtDate(notifDate)}</TableCell>
													<TableCell sx={{ fontSize: 12 }}>{fmtDate(valDate)}</TableCell>
													<TableCell>
														{sc ? <Chip label={sc.label} size="small"
															sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }} /> : "—"}
													</TableCell>
													<TableCell>
														{tc ? <Chip label={tc.label} size="small"
															sx={{ bgcolor: tc.bg, color: tc.color, fontWeight: 600, fontSize: 11 }} /> : "—"}
													</TableCell>
													<TableCell sx={{ fontSize: 12, maxWidth: 160 }}>
														{motif ? (
															<Tooltip title={motif} placement="top">
																<span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
																	{motif}
																</span>
															</Tooltip>
														) : "—"}
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</AccordionDetails>
				</Accordion>
			)}
		</Box>
	);
}