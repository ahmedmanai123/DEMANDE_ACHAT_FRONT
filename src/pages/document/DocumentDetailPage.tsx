import {
	Add as AddIcon,
	AttachFile as AttachFileIcon,
	Check as CheckIcon,
	Close as CloseIcon,
	ContentCopy as CopyIcon,
	Delete as DeleteIcon,
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
	TableRow,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
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
	const [, setTotaux] = useState<Record<string, unknown>>({});

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
	const epValiderAERP = asNumber(document.eP_ValiderAERP ?? document.EP_ValiderAERP);
	const isCloturer = epValiderAERP === Type_Validation_Document.Cloturer;
	const isValiderSage = epValiderAERP === Type_Validation_Document.Valider_Sage;
	const isAnnuler = epValiderAERP === Type_Validation_Document.Annuler;
	const isEnCours =
		epValiderAERP === Type_Validation_Document.Encours || epValiderAERP === Type_Validation_Document.Encours_Creation;

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
					bNo: asNumber(docData.b_No ?? docData.B_No),
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
				bNo: asNumber(document.b_No ?? document.B_No),
				pageIndex: 1,
				pageSize: 1000,
			});
			const resRecord = asRecord(res);
			const linesArray = Array.isArray(res) ? res : Array.isArray(resRecord.data) ? resRecord.data : [];
			setLines(linesArray as DocumentLine[]);
		} catch {
			setLines([]);
		}
	}, [epNumero, tpNo, isNew, document]);

	useEffect(() => {
		void loadDocument();
	}, [loadDocument]);

	// Save document header
	const onSaveDocument = async () => {
		setSaving(true);
		try {
			const formData = new FormData();
			formData.append("eP_Numero", asString(document.eP_Numero ?? document.EP_Numero));
			formData.append("tP_No", String(tpNo));
			formData.append("eP_Date", asString(document.eP_Date ?? document.EP_Date));
			formData.append("eP_Tiers", asString(document.eP_Tiers ?? document.EP_Tiers));
			formData.append("eP_DateLivraison", asString(document.eP_DateLivraison ?? document.EP_DateLivraison));
			formData.append("eP_Reference", asString(document.eP_Reference ?? document.EP_Reference));
			formData.append("dE_No", String(asNumber(document.dE_No ?? document.DE_No)));
			formData.append("cO_No", String(asNumber(document.cO_No ?? document.CO_No)));
			formData.append("cA_Num", asString(document.cA_Num ?? document.CA_Num));
			formData.append("cL_ChampLibre", JSON.stringify(champsLibreEntete));

			const res = await saveDetailsDocument(Object.fromEntries(formData));
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
				toast.success("Document enregistré");
				if (isNew && resRecord.eP_Numero) {
					setSearchParams({ epNumero: asString(resRecord.eP_Numero), tpNo: String(tpNo) });
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

	// Change document state (clôturer/déclôturer)
	const onChangerEtat = async () => {
		let typeValidation = Type_Validation_Document.Cloturer;
		if (isCloturer) {
			typeValidation = Type_Validation_Document.Encours;
		} else if (isEnCours) {
			typeValidation = Type_Validation_Document.Cloturer;
		}

		const message = isCloturer
			? "Êtes-vous sûr de vouloir dé-clôturer ce document ?"
			: "Êtes-vous sûr de vouloir clôturer ce document ?";

		if (!window.confirm(message)) return;

		try {
			const res = await changerEtatDocument(
				asString(document.eP_Numero ?? document.EP_Numero),
				tpNo,
				asNumber(document.b_No ?? document.B_No),
				typeValidation,
			);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
				toast.success("État changé avec succès");
				await loadDocument();
				if (asBool(resRecord.totalementCloturer)) {
					if (window.confirm("Cette demande a été totalement clôturée. Voulez-vous consulter le récap ?")) {
						window.open(`/besoin/details?id=${asNumber(document.b_No ?? document.B_No)}&type=${tpNo}`, "_blank");
					}
				}
			} else {
				toast.error(asString(resRecord.Message));
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
			if (asBool(resRecord.isValid)) {
				toast.success("Document validé dans Sage");
				setDocument((prev) => ({
					...prev,
					eP_NumeroSage: resRecord.eP_NumeroSage,
					eP_ValiderAERP: Type_Validation_Document.Valider_Sage,
				}));
			} else {
				toast.error(asString(resRecord.Message));
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
			if (asBool(resRecord.isValid)) {
				toast.success("Document annulé");
				await loadDocument();
			} else {
				toast.error(asString(resRecord.Message));
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
			if (asBool(resRecord.isValid)) {
				if (!gardeTrace && asBool(resRecord.redirectToBC)) {
					window.location.href = "/document/bons-commande";
				} else {
					toast.success("Document transformé");
					await loadDocument();
				}
			} else {
				toast.error(asString(resRecord.Message));
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
			if (asBool(resRecord.isValid)) {
				toast.success("Document comptabilisé");
				setDocument((prev) => ({ ...prev, eP_Comptabiliser: 1 }));
			} else {
				toast.error(asString(resRecord.Message));
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

			const formData = new FormData();
			formData.append("dL_No", String(lineForm.lP_No));
			formData.append("aR_Ref", lineForm.ar_Ref);
			formData.append("aR_Design", lineForm.ar_Design);
			formData.append("cA_Num", lineForm.ca_Num_Ligne);
			formData.append("lP_DateLivraison", lineForm.lp_DateLivraison);
			formData.append("dL_QteMvt", String(lineForm.lp_QteMvt));
			formData.append("dL_ValeurRemise", String(lineForm.lp_ValeurRemise));
			formData.append("dL_TypeRemise", String(lineForm.lp_TypeRemise));
			formData.append("dL_PrixUnitaire", String(lineForm.lp_PrixUnitaire));
			formData.append("cL_ChampLibre", JSON.stringify(champsLibreLigne));
			formData.append("dE_No", String(asNumber(document.dE_No ?? document.DE_No)));
			formData.append("cT_Num", asString(document.eP_Tiers ?? document.EP_Tiers));

			const res = await addOrUpdateLigneDocument(
				asString(document.eP_Numero ?? document.EP_Numero),
				tpNo,
				Object.fromEntries(formData),
			);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
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
			lp_DateLivraison:
				asString(document.eP_DateLivraison ?? document.EP_DateLivraison) || dayjs().format("YYYY-MM-DD"),
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
			lp_DateLivraison: line.lP_DateLivraison,
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

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
				<Typography>Chargement...</Typography>
			</Box>
		);
	}

	const isReadOnly = isCloturer || isValiderSage || isAnnuler;

	return (
		<Box sx={{ maxWidth: 1600, mx: "auto", p: 2 }}>
			{/* Breadcrumb */}
			<Box sx={{ mb: 2 }}>
				<Typography variant="body2" color="text.secondary">
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
							: `${asString(document.eP_Numero ?? document.EP_Numero)} (${asString(document.eP_Tiers ?? document.EP_Tiers)} | ${asString(document.cT_Intitule ?? document.CT_Intitule)})`}
					</strong>
				</Typography>
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
					!asNumber(document.eP_Comptabiliser ?? document.EP_Comptabiliser) && (
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
				<Button variant="outlined" size="small" startIcon={<CloseIcon />} onClick={onClose}>
					Fermer
				</Button>
			</Stack>

			{/* Document Header Card */}
			<Card sx={{ mb: 2, borderLeft: 4, borderColor: "primary.main" }}>
				<CardContent>
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
										<IconButton size="small" color="info" disabled={isReadOnly}>
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
								{lines.map((line) => (
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

					{/* Taxes Table */}
					{taxes.length > 0 && (
						<TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
							<Typography variant="subtitle2" sx={{ p: 1, bgcolor: "#f5f5f5" }}>
								Taxes
							</Typography>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Base taxe</TableCell>
										<TableCell>Taux</TableCell>
										<TableCell>Montant</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{taxes.map((tax, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: taxes have no unique id
										<TableRow key={`tax-${idx}`}>
											<TableCell>{tax.lt_BaseTaxe.toFixed(2)}</TableCell>
											<TableCell>{tax.lt_Taux}%</TableCell>
											<TableCell>{tax.lt_MontantTaxe.toFixed(2)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</>
			)}

			{/* Attachments Tab */}
			{activeTab === 1 && (
				<Card>
					<CardContent>
						<Typography>Attachements (à implémenter)</Typography>
					</CardContent>
				</Card>
			)}
		</Box>
	);
}
