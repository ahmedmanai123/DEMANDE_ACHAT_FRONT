import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

const asBool = (value: unknown): boolean => value === true || value === "true" || value === 1;

const toFixedIfNumber = (value: unknown): string => {
	const n = asNumber(value);
	return n
		? new Intl.NumberFormat("fr-FR", {
				minimumFractionDigits: 0,
				maximumFractionDigits: 3,
			}).format(n)
		: "";
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
	});

	// ── Valeurs dérivées ───────────────────────────────────────────────────────

	const demande = asRecord(details.demande);
	const etatAffectation = asNumber(demande.B_Etat_Affectation_Acheteur);
	const adTypeDemande = asNumber(demande.AD_TypeDemande);
	const bNumero = asString(demande.B_Numero || besoin.B_Numero);

	const existDemandeGenerer = asBool(details.exist_Demande_Generer);
	const lieeDemandeGenerer = asBool(details.liee_Demande_Generer);
	const isParticelAffection = asBool(details.isParticelaffection);
	const vId = asNumber(details.v_Id);
	const vAcheteur = asBool(details.v_Acheteur);

	const isRetourDemande = adTypeDemande === Type_Validation.Retour_Demande_Validation;
	const isAcheter = etatAffectation === ETAT_ACHETER;
	const isGenereOuPlus = etatAffectation >= ETAT_GENERE;

	// changerEtatAffectation() logic
	const { showFormButtons, showHistorique, formDisabled } = useMemo(() => {
		if (isAcheter) return { showFormButtons: false, showHistorique: true, formDisabled: true };
		if (isGenereOuPlus) return { showFormButtons: true, showHistorique: true, formDisabled: false };
		return { showFormButtons: true, showHistorique: false, formDisabled: false };
	}, [isAcheter, isGenereOuPlus]);

	const showFournisseur = !isRetourDemande && form.aD_TypeAffectation === TypeAffectation.Fournisseur;
	const showDocument = !isRetourDemande && form.aD_TypeAffectation === TypeAffectation.Document;
	const isRetourSansPartiel = isRetourDemande && !isParticelAffection;
	const showColonnesDocument = existDemandeGenerer && !isRetourDemande;

	const showDivDemande = !showValidationRetour;
	const showBtnCommande = showValidationRetour && canGenererBC;
	const showBtnAnnuler = canAnnulerDemande && !isAcheter;
	const showCrudButtons = showFormButtons && !showValidationRetour;
	const showBtnGenerer = !isRetourSansPartiel && showFormButtons && !isAcheter;
	const showBtnValider = showFormButtons && !isAcheter;

	// ── loadDocsForAffectation ─────────────────────────────────────────────────

	const loadDocsForAffectation = useCallback(async (aD_No: number): Promise<void> => {
		if (!aD_No) {
			setDocs([]);
			return;
		}
		try {
			const epTiers = await getTiersDocumentsNonValider(aD_No);
			const rows = (await getDocumentsNonValider(TypeSage.BC_Achat, epTiers)) as Array<Record<string, unknown>>;
			setDocs((rows ?? []).map((r) => ({ value: asString(r.Value), text: asString(r.Text) })));
			setForm((prev) => ({ ...prev, eP_Tiers: epTiers }));
		} catch {
			setDocs([]);
		}
	}, []);

	// ── loadAll ────────────────────────────────────────────────────────────────

	const loadAll = useCallback(async (): Promise<void> => {
		setLoading(true);
		try {
			const [d, b, a, aff] = await Promise.all([
				getDetailsDemandeAAcheter(besoinId),
				getBesoinById(besoinId),
				getBesoinArticles(besoinId),
				getAffectationDetails({ B_No: besoinId, TP_No: tpNo }),
			]);
			const dR = asRecord(d);
			const bR = asRecord(b);
			setDetails(dR);
			setBesoin(bR);
			setArticles(Array.isArray(a) ? a : []);
			setAffectations(Array.isArray(asRecord(aff).data) ? (asRecord(aff).data as AFFECTATION_DEMANDEDto[]) : []);

			// Historique — read current filter without adding it to deps
			setHistoriqueFilter((currentFilter) => {
				void getHistoriqueValidation(
					{ ...currentFilter, B_No: besoinId, BT_Id: asNumber(bR.BT_Id) } as never,
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
				const cols = compRows[0].map((_, i) => `col_${i}`);
				setComparatifColumns(cols);
				setComparatifRows(
					compRows.map((r) => {
						const obj: Record<string, unknown> = {};
						cols.forEach((c, i) => {
							obj[c] = r[i];
						});
						return obj;
					}),
				);
			} else {
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
			const _etatAff = asNumber(asRecord(dR.demande).B_Etat_Affectation_Acheteur);
			const _etatRetour = asNumber(asRecord(dR.demande).B_EtatRetour);
			const _vAcheteur = asBool(dR.v_Acheteur);

			if (_etatAff !== ETAT_ACHETER && _etatRetour === 0 && _vAcheteur) {
				try {
					const cloturer = await verifierDemandeCloturer(besoinId, TypeSage.Demande_Achat);
					if (asBool(cloturer) && _etatAff !== 0) {
						const affichier = await affichieraffectionDemande(besoinId, asNumber(bR.BT_Id), tpNo);
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
	}, [besoinId, tpNo]);

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
		});
	}, []);

	const onFournisseurPrincipal = useCallback(async (baNo: number): Promise<void> => {
		if (!baNo) return;
		try {
			const res = await getFournisseurPrincipal(baNo);
			const ctNum = asString(asRecord(res).cT_Num);
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
					TP_No: tpNo,
					...(tpNo === TypeSage.BC_Achat ? { AD_Etat: 1 } : {}),
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
			await genererAffectationFournisseur(besoinId, tpNo);
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
			const typeV = isRetourDemande ? Type_Validation.Retour_Demande_Validation : (0 as Type_Validation);
			await genererDocument(besoinId, tpNo, typeV);
			toast.success("Validation terminée.");
			if (isRetourDemande) window.location.href = "/Document/Bons_Commande";
			else window.location.href = `/Besoin/DetailsDemande?id=${besoinId}&type=${tpNo}`;
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
													<TableCell>État retour</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{rows.length === 0 && (
													<TableRow>
														<TableCell colSpan={7} align="center">
															Aucune ligne
														</TableCell>
													</TableRow>
												)}
												{rows.map((row, rowIdx) => {
													const adNo = asNumber(row.AD_No ?? row.aD_No);
													const isSelected =
														asNumber(selectedRetourRows[baNo]?.AD_No ?? selectedRetourRows[baNo]?.aD_No) === adNo;
													return (
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
															<TableCell>{asNumber(row.AD_EtatRetour ?? row.aD_EtatRetour)}</TableCell>
														</TableRow>
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
							{showCrudButtons && canCreate && (
								<Button
									variant="contained"
									size="small"
									disabled={saving || formDisabled}
									onClick={() => void onSaveAffectation()}
								>
									Enregistrer
								</Button>
							)}
							{showCrudButtons && canDelete && (
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
							{showCrudButtons && canCreate && (
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
														eP_Tiers: asString(r.EP_Tiers ?? r.eP_Tiers),
														aD_NoDocument_Affectation: asNumber(
															r.AD_NoDocument_Affectation ?? r.aD_NoDocument_Affectation,
														),
														aD_NoOrigine: asNumber(r.AD_NoOrigine ?? r.aD_NoOrigine),
														aD_NoListDoc: asNumber(r.AD_NoDocument_Affectation ?? r.aD_NoDocument_Affectation),
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

			{/* Tableaux comparatifs */}
			{lieeDemandeGenerer && (
				<Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
					<Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
						<Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: 600 }}>
							Tableaux Comparatifs
						</Typography>
						<Button
							variant="outlined"
							size="small"
							onClick={() => void exportTableauxComparatifsExcel(besoinId, bNumero)}
						>
							Exporter Excel
						</Button>
					</Stack>
					{comparatifRows.length === 0 ? (
						<Alert severity="info">Aucun tableau comparatif disponible.</Alert>
					) : (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										{comparatifColumns.map((c) => (
											<TableCell key={c}>{c}</TableCell>
										))}
									</TableRow>
								</TableHead>
								<TableBody>
									{comparatifRows.map((r, rIdx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: dynamic columns without stable id
										<TableRow key={rIdx}>
											{comparatifColumns.map((c) => (
												<TableCell key={c}>{asString(r[c])}</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
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
