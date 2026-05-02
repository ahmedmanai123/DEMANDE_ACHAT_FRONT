/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
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
	TextField,
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

// Etat_Affectation_Acheteur: Brouillon=0, Encours=1, Generer_Demande=2, Acheter=3, Valider=4
const ETAT_ACHETER = 3;
const ETAT_GENERE = 2;

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
	return <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.color, color: "#fff", fontWeight: 600 }} />;
}

// ─── EtatRetourChip ───────────────────────────────────────────────────────────

function EtatRetourChip({ etat }: { etat: number }) {
	const map: Record<number, { label: string; color: string; icon: ReactElement }> = {
		0: {
			label: "Non effectué",
			color: "#343a40",
			icon: <HourglassEmptyIcon fontSize="small" />,
		},
		1: {
			label: "En cours",
			color: "#ffc107",
			icon: <ScheduleIcon fontSize="small" />,
		},
		2: {
			label: "En attente validation acheteur",
			color: "#17a2b8",
			icon: <VerifiedUserIcon fontSize="small" />,
		},
		3: {
			label: "Validée",
			color: "#28a745",
			icon: <CheckCircleIcon fontSize="small" />,
		},
		4: {
			label: "Refusée",
			color: "#dc3545",
			icon: <CancelIcon fontSize="small" />,
		},
		5: {
			label: "Achetée",
			color: "#007bff",
			icon: <ShoppingCartIcon fontSize="small" />,
		},
	};
	const cfg = map[etat] ?? { label: "Inconnu", color: "#666", icon: undefined };
	return (
		<Chip
			label={cfg.label}
			size="small"
			icon={cfg.icon}
			sx={{
				bgcolor: cfg.color,
				color: "#fff",
				fontWeight: 500,
				"& .MuiChip-icon": { color: "#fff" },
			}}
		/>
	);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BesoinAffectationPage({
	besoinId,
	tpNo = TypeSage.Demande_Achat,
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
		V_Type: Type_Validation.Retour_Demande_Validation,
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
	// Récupérer tpNo depuis les données de la demande pour s'assurer qu'est correct
	const actualTpNo = asNumber(getAny(demande, "B_TypeDocument", "b_TypeDocument", "TP_No", "tP_No")) || tpNo;
	const detailFields = [
		{ label: "Titre", value: getField(demande, "B_Titre", "b_Titre") || getField(besoin, "B_Titre", "b_Titre") },
		{ label: "Date", value: getField(demande, "B_Date", "b_Date") || getField(besoin, "B_Date", "b_Date") },
		{ label: "Demandeur", value: getField(demande, "D_Intitule", "d_Intitule", "Demandeur", "demandeur") },
		{ label: "Depot", value: getField(demande, "DE_Intitule", "dE_Intitule", "Depot", "depot") },
		{ label: "Type document", value: actualTpNo === TypeSage.BC_Achat ? "Bon de commande achat" : "Demande de prix" },
	];

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

	// changerEtatAffectation() logic - correspond à la logique MVC
	const { showFormButtons, showHistorique, formDisabled } = useMemo(() => {
		if (isAcheter) {
			return { showFormButtons: false, showHistorique: true, formDisabled: true };
		}
		if (isGenereOuPlus) {
			// Si Disabled_Aff est True ou état >= Generer_Demande
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
	const showListLignePiece = !isRetourSansPartiel; // Afficher dans le mode normal

	const showDivDemande = !showValidationRetour;
	const showBtnCommande = showValidationRetour && canGenererBC;
	const showBtnAnnuler = canAnnulerDemande && !isAcheter;
	const showCrudButtons = showFormButtons && !showValidationRetour;
	const showBtnGenerer = !isRetourSansPartiel && showFormButtons && !isAcheter;
	const showBtnValider = showFormButtons && !isAcheter;

	// Logique MVC pour l'affichage des boutons CRUD selon permissions
	const showBtnNouveau = showCrudButtons && canCreate;
	const showBtnEnregistrer = showCrudButtons && canCreate;
	const showBtnSupprimer = showCrudButtons && canDelete;
	const fournisseurOptions = useMemo(() => {
		const options = fournisseurs
			.map((fournisseur) => ({ value: getTiersNum(fournisseur), text: getTiersLabel(fournisseur) }))
			.filter((fournisseur) => fournisseur.value);

		if (form.eP_Tiers && !options.some((option) => option.value === form.eP_Tiers)) {
			return [{ value: form.eP_Tiers, text: form.eP_Tiers }, ...options];
		}

		return options;
	}, [form.eP_Tiers, fournisseurs]);

	// ── loadDocsForAffectation ─────────────────────────────────────────────────

	const loadDocsForAffectation = useCallback(
		async (aD_No: number): Promise<void> => {
			if (!aD_No) {
				setDocs([]);
				return;
			}
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
			} catch {
				setDocs([]);
			}
		},
		[actualTpNo],
	);

	// ── loadAll ────────────────────────────────────────────────────────────────

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
				: Array.isArray(tiersRecord.items)
					? tiersRecord.items
					: [];
			setDetails(dR);
			setBesoin(bR);
			setArticles(Array.isArray(a) ? a : []);
			setAffectations(Array.isArray(asRecord(aff).data) ? (asRecord(aff).data as AFFECTATION_DEMANDEDto[]) : []);
			setFournisseurs(tiersRows as F_COMPTETDto[]);

			// Historique — read current filter without adding it to deps
			setHistoriqueFilter((currentFilter) => {
				void getHistoriqueValidation(
					{ ...currentFilter, B_No: besoinId, BT_Id: asNumber(getAny(bR, "BT_Id", "bT_Id")) } as never,
					currentFilter.V_Type,
				).then((hist) => {
					setHistoriqueRows(
						Array.isArray(asRecord(hist).data) ? (asRecord(hist).data as Record<string, unknown>[]) : [],
					);
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
					const fournisseur = fournisseurs.find((f) => asString((f as unknown as Record<string, unknown>).CT_Num) === col);
					if (fournisseur) {
						const ctIntitule = asString((fournisseur as unknown as Record<string, unknown>).CT_Intitule);
						return `${col} | ${ctIntitule}`;
					}
					return col;
				});

				const dataRowsWithMetadata = compRows.slice(1).map((row) => {
					const obj: Record<string, unknown> = {};
					visibleColumnNames.forEach((col, i) => {
						const originalIndex = allColumnNames.indexOf(col);
						obj[col] = row[originalIndex];
					});
					if (posMoinsDisantIndex !== -1) {
						obj._posMoinsDisant = asNumber(row[posMoinsDisantIndex]);
					}
					if (posPlusCherIndex !== -1) {
						obj._posPlusCher = asNumber(row[posPlusCherIndex]);
					}
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

			// Lignes retour par article — parallel fetch
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
				} catch {
					setShowValidationRetour(false);
				}
			} else {
				setShowValidationRetour(false);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur de chargement.");
		} finally {
			setLoading(false);
		}
	}, [besoinId, actualTpNo]);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	// ── Actions ────────────────────────────────────────────────────────────────

	const resetForm = useCallback(() => {
		setForm({
			aD_No: 0,
			bA_No: 0,
			aD_TypeAffectation: TypeAffectation.Fournisseur,
			eP_Tiers: "",
			aD_NoDocument_Affectation: 0,
			aD_NoOrigine: 0,
			aD_NoListDoc: 0,
			listLignePiece: 0,
		});
	}, []);

	const onFournisseurPrincipal = useCallback(async (baNo: number): Promise<void> => {
		if (!baNo) return;
		try {
			const res = await getFournisseurPrincipal(baNo);
			const ctNum = getTiersNum(res);
			if (ctNum) setForm((p) => ({ ...p, eP_Tiers: ctNum }));
		} catch {
			/* silencieux */
		}
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
		if (!isRetourSansPartiel && !form.bA_No) {
			toast.error("Choix article est obligatoire");
			return;
		}
		if (!isRetourSansPartiel && !form.aD_TypeAffectation) {
			toast.error("Choix type d'affectation est obligatoire");
			return;
		}
		if (!isRetourSansPartiel && form.aD_TypeAffectation === TypeAffectation.Fournisseur && !form.eP_Tiers) {
			toast.error("Choix fournisseur est obligatoire");
			return;
		}
		if (
			!isRetourSansPartiel &&
			form.aD_TypeAffectation === TypeAffectation.Document &&
			!form.aD_NoDocument_Affectation
		) {
			toast.error("Choix document est obligatoire");
			return;
		}
		setSaving(true);
		try {
			if (isRetourSansPartiel) {
				await addAffectation({
					AD_No: form.aD_No || 0,
					B_No: besoinId,
					BA_No: form.bA_No,
					AD_TypeAffectation: form.aD_NoListDoc ? TypeAffectation.Document : form.aD_TypeAffectation,
					EP_Tiers: form.eP_Tiers || undefined,
					AD_NoDocument_Affectation: form.aD_NoListDoc || undefined,
					AD_NoOrigine: form.aD_NoOrigine || undefined,
					AD_ArticleRetour: true,
					TP_No: TypeSage.BC_Achat,
					AD_TypeDemande: Type_Validation.Retour_Demande_Validation,
					AD_Etat: 1,
					AD_EtatRetour: EtatRetour.Valider,
				});
			} else {
				await addAffectation({
					AD_No: form.aD_No || 0,
					B_No: besoinId,
					BA_No: form.bA_No,
					AD_TypeAffectation: form.aD_TypeAffectation,
					EP_Tiers: form.eP_Tiers || undefined,
					AD_NoDocument_Affectation: form.aD_NoDocument_Affectation || undefined,
					TP_No: actualTpNo,
					...(actualTpNo === TypeSage.BC_Achat ? { AD_Etat: 1 } : {}),
				});
			}
			toast.success("Affectation enregistrée.");
			resetForm();
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur d'enregistrement.");
		} finally {
			setSaving(false);
		}
	};

	const onDeleteAffectation = async (): Promise<void> => {
		if (!form.aD_No) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
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
		if (affectations.length === 0) {
			onBack();
			return;
		}
		try {
			await deleteAffectation(0, besoinId);
			if (vId === 0) {
				onBack();
			} else {
				window.location.href = `/Besoin/Validation_Demande?id=${vId}&b_No=${besoinId}`;
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de l'annulation.");
		}
	};

	const onGenererSelonFournisseur = async (): Promise<void> => {
		const rep = await getArticlesSansFournisseur(besoinId, true);
		const rr = asRecord(rep);
		if (asString(rr.messageArticle)) {
			toast.error(`Articles sans fournisseur: ${asString(rr.messageArticle)}`);
			return;
		}
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
		if (asString(rr.messageArticle)) {
			toast.error(`Articles invalides: ${asString(rr.messageArticle)}`);
			return;
		}
		setGenerating(true);
		try {
			// type: Type_Validation.Demande_Besoin (0) pour demande normale, Type_Validation.Retour_Demande_Validation (1) pour retour
			const typeV = isRetourDemande ? Type_Validation.Retour_Demande_Validation : Type_Validation.Demande_Besoin;
			await genererDocument(besoinId, actualTpNo, typeV);
			toast.success("Validation terminée.");
			if (isRetourDemande) window.location.href = "/documents?tpNo=12";
			else onBack(); // Retourner à la page précédente au lieu de rediriger vers une route inexistante
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur pendant la validation.");
		} finally {
			setGenerating(false);
		}
	};

	const onValiderSelectionRetour = async (): Promise<void> => {
		try {
			const rows = vAcheteur ? Object.values(selectedRetourRows) : Object.values(retourRowsByArticle).flat();
			if (rows.length === 0) {
				toast.error("Aucun article à affecter.");
				return;
			}
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
		if (!selected) {
			toast.error("Sélectionnez une ligne à annuler.");
			return;
		}
		const motif = window.prompt("Motif d'annulation");
		if (!motif?.trim()) return;
		try {
			await rejetArticleRetourDemande({
				v_Id: vId,
				AD_No: asNumber(selected.AD_No ?? selected.aD_No),
				Motif: motif,
				B_No: besoinId,
				MR_No: 0,
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
		<Box sx={{ maxWidth: 1400, mx: "auto", p: 2 }}>
			{/* En-tête */}
			<Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
					<Button variant="outlined" onClick={onBack}>
						Retour
					</Button>
					<Typography variant="h6">
						{isRetourDemande ? `Retour de demande de besoin N° ${bNumero}` : `Demande de besoin N° ${bNumero}`}
					</Typography>
				</Stack>
				<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
					<EtatChip etat={etatAffectation} />
					{showBtnCommande && (
						<Button variant="contained" color="success" size="small" onClick={() => void onValiderSelectionRetour()}>
							Bon de commande
						</Button>
					)}
					{showBtnAnnuler && (
						<Button variant="contained" color="error" size="small" onClick={() => void onAnnuler()}>
							Annuler la demande
						</Button>
					)}
					{showBtnValider && (
						<Button
							variant="contained"
							color="success"
							size="small"
							disabled={generating}
							onClick={() => void onValider()}
						>
							Valider
						</Button>
					)}
				</Stack>
			</Stack>

			{lieeDemandeGenerer && (
				<Alert severity="info" sx={{ mb: 2 }}>
					Des documents sont déjà générés pour cette demande. La table d'affectation reste consultable.
				</Alert>
			)}

			<Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
				<Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: 600, mb: 1.5 }}>
					Details de la demande
				</Typography>
				<Grid container spacing={2} sx={{ flexWrap: "wrap" }}>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField size="small" fullWidth label="N° de demande" value={bNumero || "-"} disabled />
					</Grid>
					{detailFields.map((field) => (
						<Grid key={field.label} size={{ xs: 12, md: 4 }}>
							<TextField size="small" fullWidth label={field.label} value={field.value || "-"} disabled />
						</Grid>
					))}
				</Grid>
			</Paper>

			{/* Section Validation retour */}
			{showValidationRetour && (
				<Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
					<Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
						<Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: 600 }}>
							Validation retour
						</Typography>
						<Stack direction="row" spacing={1}>
							<Button variant="outlined" color="error" size="small" onClick={() => void onAnnulerRetour()}>
								Annuler retour
							</Button>
							<Button variant="contained" color="success" size="small" onClick={() => void onValiderSelectionRetour()}>
								Valider sélection
							</Button>
						</Stack>
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
													<TableCell />
													<TableCell>Fournisseur</TableCell>
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
													<TableRow>
														<TableCell colSpan={8} align="center">
															Aucune ligne
														</TableCell>
													</TableRow>
												)}
												{rows.map((row, rowIdx) => {
													const adNo = asNumber(row.AD_No ?? row.aD_No);
													const isSelected =
														asNumber(selectedRetourRows[baNo]?.AD_No ?? selectedRetourRows[baNo]?.aD_No) === adNo;
													const hasAttachments = asNumber(row.LP_NbAttachement ?? row.lP_NbAttachement) > 0;
													const hasRejet =
														asString(row.AD_Motif ?? row.aD_Motif) &&
														asNumber(row.AD_IDValidateurRejetArticle ?? row.aD_IDValidateurRejetArticle);
													return (
														<>
															<TableRow key={adNo || rowIdx} selected={isSelected}>
																<TableCell padding="checkbox">
																	<IconButton
																		size="small"
																		onClick={() =>
																			setSelectedRetourRows((prev) => ({
																				...prev,
																				[baNo]: isSelected ? ({} as Record<string, unknown>) : row,
																			}))
																		}
																	>
																		{isSelected ? "●" : "○"}
																	</IconButton>
																</TableCell>
																<TableCell>{asString(row.AD_Fournisseur ?? row.aD_Fournisseur)}</TableCell>
																<TableCell>{asString(row.AR_Article ?? row.aR_Article)}</TableCell>
																<TableCell align="right">
																	{toFixedIfNumber(row.AR_QteDemande ?? row.aR_QteDemande)}
																</TableCell>
																<TableCell align="right">{toFixedIfNumber(row.LP_QteMvt ?? row.lP_QteMvt)}</TableCell>
																<TableCell>
																	{asString(row.LP_NumDocument_Generer ?? row.lP_NumDocument_Generer)}
																</TableCell>
																<TableCell align="center">
																	{hasAttachments && (
																		<IconButton
																			size="small"
																			color="info"
																			title="Pièces jointes"
																			onClick={(e) => {
																				e.stopPropagation();
																				// TODO: Ouvrir la popup des pièces jointes
																				toast.info("Pièces jointes : Fonctionnalité à implémenter");
																			}}
																		>
																			<AttachFileIcon fontSize="small" />
																		</IconButton>
																	)}
																</TableCell>
																<TableCell>
																	<EtatRetourChip etat={asNumber(row.AD_EtatRetour ?? row.aD_EtatRetour)} />
																</TableCell>
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
				</Paper>
			)}

			{/* Section Demande */}
			{showDivDemande && (
				<>
					<Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
						<Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: 600, mb: 2 }}>
							Affectation
						</Typography>

						{/* Article + Type */}
						{!isRetourSansPartiel && (
							<Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start", mb: 2 }}>
								<FormControl size="small" fullWidth>
									<InputLabel>Article</InputLabel>
									<Select
										label="Article"
										value={form.bA_No}
										disabled={formDisabled}
										onChange={(e) => void onArticleChange(Number(e.target.value))}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{articles.map((a, aIdx) => {
											const ar = a as Record<string, unknown>;
											const id = asNumber(ar.BA_No ?? ar.bA_No);
											const lbl = asString(ar.BA_DesigArticle ?? ar.bA_DesigArticle);
											return (
												<MenuItem key={id || aIdx} value={id}>
													{lbl || `Article ${id}`}
												</MenuItem>
											);
										})}
									</Select>
								</FormControl>
								<FormControl size="small" fullWidth>
									<InputLabel>Type</InputLabel>
									<Select
										label="Type"
										value={form.aD_TypeAffectation}
										disabled={formDisabled}
										onChange={(e) => void onTypeAffectationChange(Number(e.target.value))}
									>
										<MenuItem value={TypeAffectation.Fournisseur}>Fournisseur</MenuItem>
										<MenuItem value={TypeAffectation.Document}>Document</MenuItem>
									</Select>
								</FormControl>
								{showListLignePiece && (
									<FormControl size="small" fullWidth>
										<InputLabel>Ligne de pièce</InputLabel>
										<Select
											label="Ligne de pièce"
											value={form.listLignePiece}
											disabled={formDisabled}
											onChange={async (e) => {
												const adNo = Number(e.target.value);
												setForm((p) => ({ ...p, listLignePiece: adNo }));
												await loadDocsForAffectation(adNo);
											}}
										>
											<MenuItem value={0}>Choisir</MenuItem>
											{affectations.map((aff) => {
												const a = aff as Record<string, unknown>;
												const adNo = asNumber(a.AD_No ?? a.aD_No);
												const doc = asString(a.AD_Document ?? a.aD_Document);
												return (
													<MenuItem key={adNo} value={adNo}>
														{doc || `Affectation ${adNo}`}
													</MenuItem>
												);
											})}
										</Select>
									</FormControl>
								)}
							</Stack>
						)}

						{/* Fournisseur */}
						{showFournisseur && (
							<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
								<FormControl size="small" sx={{ minWidth: 300 }}>
									<InputLabel>Fournisseur</InputLabel>
									<Select
										label="Fournisseur"
										value={form.eP_Tiers}
										disabled={formDisabled}
										onChange={(e) => setForm((p) => ({ ...p, eP_Tiers: String(e.target.value) }))}
									>
										<MenuItem value="">Choisir</MenuItem>
										{fournisseurOptions.map((fournisseur) => (
											<MenuItem key={fournisseur.value} value={fournisseur.value}>
												{fournisseur.text}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Stack>
						)}

						{/* Document */}
						{showDocument && (
							<Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
								<FormControl size="small" sx={{ minWidth: 300 }}>
									<InputLabel>Document</InputLabel>
									<Select
										label="Document"
										value={form.aD_NoDocument_Affectation}
										disabled={formDisabled}
										onChange={(e) => setForm((p) => ({ ...p, aD_NoDocument_Affectation: Number(e.target.value) }))}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{docs.map((d) => (
											<MenuItem key={d.value} value={Number(d.value)}>
												{d.text}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								{canConsultDocument && (
									<IconButton
										size="small"
										color="info"
										disabled={!form.aD_NoDocument_Affectation}
										onClick={() => {
											if (form.aD_NoDocument_Affectation)
												window.open(`/Document/DetailsDocument?lP_No=${form.aD_NoDocument_Affectation}`, "_blank");
										}}
									>
										<OpenInNewIcon />
									</IconButton>
								)}
							</Stack>
						)}

						{/* Mode retour sans partiel */}
						{isRetourSansPartiel && (
							<Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start", mb: 2 }}>
								<FormControl size="small" fullWidth>
									<InputLabel>Ligne de pièce (origine)</InputLabel>
									<Select
										label="Ligne de pièce (origine)"
										value={form.aD_NoOrigine}
										disabled={formDisabled}
										onChange={async (e) => {
											const adNo = Number(e.target.value);
											setForm((p) => ({ ...p, aD_NoOrigine: adNo }));
											await loadDocsForAffectation(adNo);
										}}
									>
										<MenuItem value={0}>Choisir</MenuItem>
									</Select>
								</FormControl>
								<FormControl size="small" fullWidth>
									<InputLabel>Document</InputLabel>
									<Select
										label="Document"
										value={form.aD_NoListDoc}
										disabled={formDisabled || docs.length === 0}
										onChange={(e) => setForm((p) => ({ ...p, aD_NoListDoc: Number(e.target.value) }))}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{docs.map((d) => (
											<MenuItem key={d.value} value={Number(d.value)}>
												{d.text}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Stack>
						)}

						{/* Boutons */}
						<Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
							{showBtnEnregistrer && (
								<Button
									variant="contained"
									size="small"
									disabled={saving || formDisabled}
									onClick={() => void onSaveAffectation()}
								>
									Enregistrer
								</Button>
							)}
							{showBtnSupprimer && (
								<Button
									variant="outlined"
									color="error"
									size="small"
									disabled={formDisabled}
									onClick={() => void onDeleteAffectation()}
								>
									Supprimer
								</Button>
							)}
							{showBtnGenerer && (
								<Button
									variant="outlined"
									size="small"
									disabled={formDisabled}
									onClick={() => void onGenererSelonFournisseur()}
								>
									Générer selon fournisseur affecté
								</Button>
							)}
							{showBtnNouveau && (
								<Button variant="outlined" size="small" onClick={resetForm}>
									Nouveau
								</Button>
							)}
						</Stack>
					</Paper>

					{/* Grille affectations */}
					<TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fournisseur</TableCell>
									<TableCell>Document</TableCell>
									<TableCell>Article</TableCell>
									<TableCell align="right">Qté</TableCell>
									{showColonnesDocument && (
										<>
											<TableCell align="right">Qté demandée</TableCell>
											<TableCell>N° doc. généré</TableCell>
											<TableCell align="right">Prix unitaire</TableCell>
											<TableCell>Remise</TableCell>
											<TableCell align="right">Montant HT</TableCell>
											<TableCell align="right">Montant TTC</TableCell>
											<TableCell align="center">État</TableCell>
										</>
									)}
									<TableCell />
								</TableRow>
							</TableHead>
							<TableBody>
								{affectations.length === 0 && (
									<TableRow>
										<TableCell colSpan={showColonnesDocument ? 12 : 5} align="center">
											Aucune affectation
										</TableCell>
									</TableRow>
								)}
								{affectations.map((row, affIdx) => {
									const r = row as Record<string, unknown>;
									const adNo = asNumber(r.AD_No ?? r.aD_No);
									const isSelected = form.aD_No === adNo && adNo !== 0;
									return (
										<TableRow
											key={adNo || affIdx}
											hover
											selected={isSelected}
											onClick={() => {
												if (isSelected) {
													resetForm();
												} else {
													setForm({
														aD_No: adNo,
														bA_No: asNumber(r.BA_No ?? r.bA_No),
														aD_TypeAffectation: asNumber(r.AD_TypeAffectation ?? r.aD_TypeAffectation) || 1,
														eP_Tiers: asString(r.EP_Tiers ?? r.eP_Tiers ?? r.CT_Num ?? r.cT_Num ?? r.ct_Num),
														aD_NoDocument_Affectation: asNumber(
															r.AD_NoDocument_Affectation ?? r.aD_NoDocument_Affectation,
														),
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
														{asNumber(r.EP_ValiderAERP ?? r.eP_ValiderAERP) === 8 ? (
															<LockOpenIcon fontSize="small" />
														) : (
															<LockIcon fontSize="small" />
														)}
													</TableCell>
												</>
											)}
											<TableCell>
												{canConsultDocument && asNumber(r.LP_No ?? r.lP_No) !== 0 && (
													<IconButton
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															window.open(
																`/Document/DetailsDocument?eP_Numero=${asString(r.LP_NumDocument_Generer ?? r.lP_NumDocument_Generer)}&tP_No=${asNumber(r.TP_No ?? r.tP_No)}`,
																"_blank",
															);
														}}
													>
														<OpenInNewIcon fontSize="small" />
													</IconButton>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				</>
			)}

			{/* Tableaux comparatifs - logique MVC: afficher si lieeDemandeGenerer OU si showHistorique */}
			{(lieeDemandeGenerer || showHistorique) && (
				<Paper variant="outlined" sx={{ mb: 2 }}>
					<Box
						sx={{
							borderBottom: "2px solid #1976d2",
							pb: 1,
							px: 2,
							pt: 2,
						}}
					>
						<Typography
							variant="subtitle1"
							sx={{
								color: "#1976d2",
								fontWeight: 700,
								textTransform: "uppercase",
							}}
						>
							Tableaux Comparatif
						</Typography>
					</Box>
					<Box sx={{ p: 2 }}>
						<Stack
							direction="row"
							sx={{
								alignItems: "center",
								justifyContent: "space-between",
								mb: 2,
							}}
						>
							<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
								Détails des prix
							</Typography>
							<Button
								variant="contained"
								size="small"
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
								<TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1, mb: 2 }}>
									<Table size="small" stickyHeader>
										<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
											<TableRow>
												{comparatifColumns.map((c, idx) => (
													<TableCell
														key={c}
														sx={{
															fontWeight: 700,
															borderBottom: "2px solid #e0e0e0",
															textAlign: idx === 0 ? "left" : "center",
														}}
													>
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
													// biome-ignore lint/suspicious/noArrayIndexKey: dynamic columns without stable id
													<TableRow
														key={rIdx}
														hover
														sx={{
															"&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
														}}
													>
														{comparatifVisibleKeys.map((key, cIdx) => {
															const value = asString(r[key]);
															const displayName = comparatifColumns[cIdx];
															let bgColor = "inherit";

															if (cIdx > 0) {
																if (posMoinsDisant !== -1 && cIdx === posMoinsDisant - 1) {
																	bgColor = "#c8e6c9";
																} else if (posPlusCher !== -1 && cIdx === posPlusCher - 1) {
																	bgColor = "#ffcdd2";
																}
															}

															return (
																<TableCell
																	key={key}
																	sx={{
																		backgroundColor: bgColor,
																		textAlign: cIdx === 0 ? "left" : "center",
																		fontWeight: cIdx === 0 ? 500 : "normal",
																	}}
																>
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
								<Stack direction="row" spacing={1}>
									<Chip
										label="Moins-disant"
										sx={{
											backgroundColor: "#c8e6c9",
											color: "#2e7d32",
											fontWeight: 600,
											border: "1px solid #a5d6a7",
										}}
									/>
									<Chip
										label="Plus-cher"
										sx={{
											backgroundColor: "#ffcdd2",
											color: "#c62828",
											fontWeight: 600,
											border: "1px solid #ef9a9a",
										}}
									/>
								</Stack>
							</>
						)}
					</Box>
				</Paper>
			)}

			{/* Historique validation */}
			{showHistorique && (
				<Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
					<Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "center", mb: 2 }}>
						<Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: 600, minWidth: 240 }}>
							Historique validation de demande
						</Typography>
						<FormControl size="small" sx={{ minWidth: 200 }}>
							<InputLabel>Type</InputLabel>
							<Select
								label="Type"
								value={historiqueFilter.V_Type}
								onChange={(e) =>
									setHistoriqueFilter((p) => ({ ...p, V_Type: Number(e.target.value) as Type_Validation }))
								}
							>
								<MenuItem value={Type_Validation.Demande_Besoin}>Demande besoin</MenuItem>
								<MenuItem value={Type_Validation.Retour_Demande_Validation}>Retour demande</MenuItem>
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Statut</InputLabel>
							<Select
								label="Statut"
								value={historiqueFilter.V_Status}
								onChange={(e) => setHistoriqueFilter((p) => ({ ...p, V_Status: Number(e.target.value) }))}
							>
								<MenuItem value={-1}>Tous</MenuItem>
								<MenuItem value={0}>En attente</MenuItem>
								<MenuItem value={1}>Rejeté</MenuItem>
								<MenuItem value={3}>Validé</MenuItem>
								<MenuItem value={4}>Attente achat</MenuItem>
								<MenuItem value={5}>Achetée</MenuItem>
								<MenuItem value={6}>Rectification</MenuItem>
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ minWidth: 200 }}>
							<InputLabel>Rôle</InputLabel>
							<Select
								label="Rôle"
								value={historiqueFilter.V_Role_Validateur}
								onChange={(e) => setHistoriqueFilter((p) => ({ ...p, V_Role_Validateur: Number(e.target.value) }))}
							>
								<MenuItem value={-1}>Tous</MenuItem>
								<MenuItem value={1}>Demandeur</MenuItem>
								<MenuItem value={2}>Responsable hiérarchique</MenuItem>
								<MenuItem value={3}>Validateur</MenuItem>
								<MenuItem value={4}>Acheteur</MenuItem>
							</Select>
						</FormControl>
						<Button variant="outlined" size="small" onClick={() => void loadAll()}>
							Filtrer
						</Button>
					</Stack>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Intitulé</TableCell>
									<TableCell>Rôle</TableCell>
									<TableCell>Date notification</TableCell>
									<TableCell>Date validation</TableCell>
									<TableCell>Statut</TableCell>
									<TableCell>Type</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{historiqueRows.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} align="center">
											Aucun enregistrement
										</TableCell>
									</TableRow>
								)}
								{historiqueRows.map((row, hIdx) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: no stable id on historique rows
									<TableRow key={hIdx}>
										<TableCell>{asString(row.US_UserIntitule ?? row.uS_UserIntitule)}</TableCell>
										<TableCell>{asNumber(row.V_Role_Validateur ?? row.v_Role_Validateur)}</TableCell>
										<TableCell>{asString(row.NU_DateTime ?? row.nU_DateTime)}</TableCell>
										<TableCell>{asString(row.V_ValidationDate ?? row.v_ValidationDate)}</TableCell>
										<TableCell>{asNumber(row.V_Status ?? row.v_Status)}</TableCell>
										<TableCell>{asNumber(row.V_Type ?? row.v_Type)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			)}
		</Box>
	);
}
