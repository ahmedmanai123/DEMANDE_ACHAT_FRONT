import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@/components/icon";
import {
	articleBesoinService,
	besoinService,
	getMotifs,
	getRetourBesoinArticles,
	type MotifItem,
	rejeterArticle,
	validationService,
} from "@/services/besoinservice";
import {
	type DA_BESOIN_ARTICLEDto,
	type DA_BESOINDto,
	type DA_VALIDATION,
	Etat,
	Etat_Besoin,
	EtatBesoinRetour,
	EtatRetour,
	Role_Validateur,
	Statut,
	Type_Validation,
	TypeSage,
	type Validateur_BesoinVM,
} from "@/types/besoin";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";
import {
	ETAT_BESOIN_LABELS,
	formatDate,
	getColorFromName,
	getInitials,
	ROLE_VALIDATEUR_LABELS,
	STATUT_LABELS,
} from "@/utils/besoin.utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────────────────────

type ValidationView = {
	besoin?: DA_BESOINDto;
	validation?: DA_VALIDATION;
	typeAF?: number;
	TypeAF?: number;
	lP_No?: number | null;
	LP_No?: number | null;
	retourObligatour?: boolean;
	RetourObligatour?: boolean;
	retourObligatoire?: boolean;
	RetourObligatoire?: boolean;
	isAffected?: boolean;
	IsAffected?: boolean;
	isAcheteur?: boolean;
	IsAcheteur?: boolean;
	isAdmin?: boolean;
	IsAdmin?: boolean;
	[key: string]: unknown;
};

type DecisionType = "reject" | "rectify" | null;
type ArticleRetour = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const asRecord = (v: unknown): Record<string, unknown> =>
	v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const asNumber = (v: unknown): number => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const asString = (v: unknown) => (v == null ? "" : String(v));
const asBool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

const getField = <T,>(record: Record<string, unknown>, ...keys: string[]): T | undefined => {
	for (const key of keys) {
		const val = record[key];
		if (val !== undefined && val !== null) return val as T;
	}
	return undefined;
};

const normalizeValidationView = (raw: unknown): ValidationView => {
	const root = asRecord(raw);
	const data = asRecord(root.data ?? root.Data);
	const source = Object.keys(data).length ? data : root;
	return {
		...source,
		besoin: getField<DA_BESOINDto>(source, "besoin", "Besoin", "item1", "Item1"),
		validation: getField<DA_VALIDATION>(source, "validation", "Validation", "item2", "Item2"),
		isAcheteur: asBool(source.isAcheteur ?? source.IsAcheteur),
		isAdmin: asBool(source.isAdmin ?? source.IsAdmin),
	};
};

const getBesoinNo = (b?: DA_BESOINDto) => asNumber(b?.B_No ?? b?.b_No);
const getBesoinTitle = (b?: DA_BESOINDto) => asString(b?.B_Titre ?? b?.b_Titre);
const getBesoinNumero = (b?: DA_BESOINDto) => asString(b?.B_Numero ?? b?.b_Numero);
const getValidationId = (v?: DA_VALIDATION) => asNumber(v?.V_Id ?? v?.v_Id);
const getValidationStatus = (v?: DA_VALIDATION) => asNumber(v?.V_Status ?? v?.v_Status);
const getValidationType = (v?: DA_VALIDATION) =>
	(v?.V_Type ?? v?.v_Type ?? Type_Validation.Demande_Besoin) as Type_Validation;
const getValidationAcheteur = (v?: DA_VALIDATION) => asBool(v?.V_Acheteur ?? v?.v_Acheteur);

const ETAT_ARTICLE_ICON: Record<number, { icon: string; color: string; label: string }> = {
	[Etat.EnAttente]: { icon: "solar:clock-circle-bold", color: "#fd7e14", label: "En cours" },
	[Etat.Valider]: { icon: "solar:check-circle-bold", color: "#198754", label: "Validée" },
	[Etat.Refuser]: { icon: "solar:close-circle-bold", color: "#dc3545", label: "Refusée" },
	[Etat.Acheter]: { icon: "solar:cart-bold", color: "#0d6efd", label: "Achetée" },
};

const ETAT_RETOUR_ICON: Record<number, { icon: string; color: string; label: string }> = {
	[EtatRetour.NonEffectue]: { icon: "solar:hourglass-line-duotone", color: "#6c757d", label: "Non effectué" },
	[EtatRetour.EnAttente]: { icon: "solar:clock-circle-bold", color: "#fd7e14", label: "En cours" },
	[EtatRetour.Attente_Validation_acheteur]: {
		icon: "solar:user-check-bold",
		color: "#17a2b8",
		label: "En attente acheteur",
	},
	[EtatRetour.Valider]: { icon: "solar:check-circle-bold", color: "#198754", label: "Validée" },
	[EtatRetour.Refuser]: { icon: "solar:close-circle-bold", color: "#dc3545", label: "Refusée" },
	[EtatRetour.Acheter]: { icon: "solar:cart-bold", color: "#0d6efd", label: "Achetée" },
};

const ROLE_BADGE_COLOR: Record<number, string> = {
	[Role_Validateur.Demandeur]: "#6c757d",
	[Role_Validateur.Responsable_Hierarchique]: "#17a2b8",
	[Role_Validateur.Validateur]: "#28a745",
	[Role_Validateur.Acheteur]: "#007bff",
};

const STATUT_BADGE_COLOR: Record<number, { bg: string; text: string }> = {
	[Statut.EnAttente]: { bg: "#6c757d", text: "#fff" },
	[Statut.Rejete]: { bg: "#dc3545", text: "#fff" },
	[Statut.Valide_Partiel]: { bg: "#17a2b8", text: "#fff" },
	[Statut.Valide]: { bg: "#28a745", text: "#fff" },
	[Statut.Attente_Acheter]: { bg: "#ffc107", text: "#000" },
	[Statut.Acheter]: { bg: "#007bff", text: "#fff" },
	[Statut.Rectifier_Demande]: { bg: "#dc3545", text: "#fff" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function BesoinValidationPage({
	validationId,
	besoinId,
	onBack,
}: {
	validationId: number;
	besoinId: number;
	onBack: () => void;
}) {
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [view, setView] = useState<ValidationView>({});
	const [articles, setArticles] = useState<DA_BESOIN_ARTICLEDto[]>([]);
	const [articlesRetour, setArticlesRetour] = useState<ArticleRetour[]>([]);
	const [circuit, setCircuit] = useState<Validateur_BesoinVM[]>([]);
	const [decision, setDecision] = useState<DecisionType>(null);
	const [motifSelectId, setMotifSelectId] = useState<number>(0);
	const [motifText, setMotifText] = useState("");
	const [motifs, setMotifs] = useState<MotifItem[]>([]);
	const [showMotifExtra, setShowMotifExtra] = useState(false);
	const [selectedArticleNo, setSelectedArticleNo] = useState<number | null>(null);

	// ── Ref pour scroll vers le panneau motif ───────────────────────────────
	const motifPanelRef = useRef<HTMLDivElement>(null);
	const pageTopRef = useRef<HTMLDivElement>(null);

	const besoin = view.besoin;
	const validation = view.validation;
	const besoinNo = getBesoinNo(besoin) || besoinId;
	const currentStatus = getValidationStatus(validation);
	const currentEtat = asNumber(besoin?.B_Etat_Besoin ?? besoin?.b_Etat_Besoin);
	const currentRetourEtat = asNumber(besoin?.B_EtatRetour ?? besoin?.b_EtatRetour);
	const typeAF = asNumber(view.typeAF ?? view.TypeAF) || TypeSage.Demande_Achat;
	const lpNo = asNumber(view.lP_No ?? view.LP_No);
	const retourObligatoire = asBool(
		view.retourObligatour ?? view.RetourObligatour ?? view.retourObligatoire ?? view.RetourObligatoire,
	);
	const isAffected = asBool(view.isAffected ?? view.IsAffected);
	const isAcheteur = asBool(view.isAcheteur ?? view.IsAcheteur);
	const validationType = getValidationType(validation);

	const isEtatEditable =
		currentEtat !== Etat_Besoin.Brouillon &&
		currentEtat !== Etat_Besoin.Refuser &&
		currentEtat !== Etat_Besoin.Rectifier_Demande &&
		currentEtat !== Etat_Besoin.Demande_Cloturer_rectifier;

	const showValidatorActions =
		getValidationId(validation) > 0 &&
		currentStatus === Statut.EnAttente &&
		isEtatEditable &&
		validationType !== Type_Validation.Retour_Demande_Validation;

	const showBuyerActions =
		getValidationId(validation) > 0 &&
		currentStatus === Statut.Attente_Acheter &&
		currentEtat !== Etat_Besoin.Refuser &&
		currentRetourEtat === EtatBesoinRetour.Aucun;

	const isDemandeAchat =
		typeAF === TypeSage.Demande_Achat && validationType === Type_Validation.Demande_Besoin && lpNo === 0;
	const isBCAchat = typeAF === TypeSage.BC_Achat && lpNo === 0;

	// ── Scroll automatique vers le panneau motif ─────────────────────────────
	useEffect(() => {
		if (decision) {
			// Petit délai pour que le DOM soit rendu
			setTimeout(() => {
				motifPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 50);
		}
	}, [decision]);

	// ── Chargement ──────────────────────────────────────────────────────────────

	const loadValidation = useCallback(async () => {
		setLoading(true);
		try {
			const [viewResponse, articlesResponse, motifsResponse] = await Promise.all([
				validationService.getValidationView(validationId, besoinId),
				articleBesoinService.getByBesoinId(besoinId).catch(() => []),
				getMotifs(besoinId).catch(() => [] as MotifItem[]),
			]);

			const normalized = normalizeValidationView(viewResponse);
			if (!normalized.besoin && besoinId > 0) {
				normalized.besoin = await besoinService.getById(besoinId);
			}
			setView(normalized);
			setArticles(Array.isArray(articlesResponse) ? articlesResponse : []);
			setMotifs(motifsResponse);

			const vType = getValidationType(normalized.validation);
			if (vType === Type_Validation.Retour_Demande_Validation) {
				const retourArticles = await getRetourBesoinArticles(besoinId).catch(() => []);
				setArticlesRetour(retourArticles);
			}

			const typeId = asNumber(normalized.besoin?.BT_Id ?? normalized.besoin?.bT_Id);
			const demandeurId = asString(normalized.besoin?.B_IdDemandeur ?? normalized.besoin?.b_IdDemandeur);
			if (typeId && demandeurId) {
				const rows = await validationService.getCircuit(typeId, besoinId, demandeurId, vType);
				setCircuit(Array.isArray(rows) ? rows : []);
			} else {
				setCircuit([]);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Impossible de charger la validation.");
		} finally {
			setLoading(false);
		}
	}, [besoinId, validationId]);

	useEffect(() => {
		void loadValidation();
	}, [loadValidation]);

	// ── Motif complet ────────────────────────────────────────────────────────────

	const buildMotif = () => {
		const selected = motifs.find((m) => (m.Value ?? m.value) === motifSelectId);
		const prefix = selected ? (selected.Text ?? selected.text ?? "") : "";
		const suffix = motifText.trim();
		return [prefix, suffix].filter(Boolean).join(" ");
	};

	// ── Validation étape — payload PascalCase normalisé ──────────────────────────

	const submitValidation = async (status: Statut) => {
		const motifFinal = buildMotif();
		setSubmitting(true);
		try {
			// Construire explicitement le payload en PascalCase
			// V_Status / V_Motif / MR_No DOIVENT être définis en dernier
			// pour ne jamais être écrasés par un spread intermédiaire
			const payload = {
				V_Id: getValidationId(validation),
				DA_BesoinId: besoinNo,
				V_ValidatorUserId: asString(validation?.V_ValidatorUserId ?? validation?.v_ValidatorUserId),
				V_Acheteur: getValidationAcheteur(validation),
				V_Type: validationType,
				// Ces trois champs en dernier — ils ne doivent jamais être écrasés
				V_Status: status,
				V_Motif: motifFinal,
				MR_No: motifSelectId || undefined,
			};

			await validationService.validerEtape(payload);
			toast.success("Validation enregistrée.");
			setDecision(null);
			resetMotif();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur pendant la validation.");
		} finally {
			setSubmitting(false);
			// Toujours rafraîchir pour refléter l'état réel du serveur
			await loadValidation();
		}
	};

	const handleConfirmDecision = async () => {
		if (!decision) return;
		const status = decision === "reject" ? Statut.Rejete : Statut.Rectifier_Demande;
		await submitValidation(status);
	};

	// ── Prise en charge acheteur ─────────────────────────────────────────────────

	const takeInCharge = async (typeValidation = true) => {
		setSubmitting(true);
		try {
			await validationService.affectationAcheteur(besoinNo, typeValidation);
			toast.success(typeValidation ? "Demande prise en charge." : "Demande libérée.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Impossible de mettre à jour la prise en charge.");
		} finally {
			setSubmitting(false);
			await loadValidation();
		}
	};

	// ── Rejeter article ──────────────────────────────────────────────────────────

	const handleRejectArticle = async (bA_No: number) => {
		const motifFinal = buildMotif();
		if (!motifFinal.trim()) {
			toast.error("Veuillez saisir un motif de rejet.");
			return;
		}
		setSubmitting(true);
		try {
			await rejeterArticle(getValidationId(validation), bA_No, motifFinal, motifSelectId);
			toast.success("Article rejeté.");
			setSelectedArticleNo(null);
			setDecision(null);
			resetMotif();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors du rejet.");
		} finally {
			setSubmitting(false);
			await loadValidation();
		}
	};

	// ── Edit inline quantité ──────────────────────────────────────────────────────

	const [editingArticle, setEditingArticle] = useState<{ no: number; qty: number } | null>(null);

	const saveEditQuantity = async () => {
		if (!editingArticle) return;
		const original = articles.find((a) => asNumber(a.BA_No ?? a.bA_No) === editingArticle.no);
		if (!original) return;
		if (editingArticle.qty <= 0) {
			toast.error("La quantité doit être supérieure à 0.");
			return;
		}
		setSubmitting(true);
		try {
			await articleBesoinService.save({
				...asRecord(original),
				BA_No: editingArticle.no,
				B_BesoinId: besoinNo,
				BA_QuantiteValider: editingArticle.qty,
			});
			toast.success("Quantité enregistrée.");
			setEditingArticle(null);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde.");
		} finally {
			setSubmitting(false);
			await loadValidation();
		}
	};

	// ── Navigation achat ─────────────────────────────────────────────────────────

	const openAchatFlow = (type: TypeSage) => {
		window.location.href = `/besoins?mode=affectation&id=${besoinNo}&type=${type}&v_Id=${getValidationId(validation)}`;
	};

	const resetMotif = () => {
		setMotifSelectId(0);
		setMotifText("");
		setShowMotifExtra(false);
	};

	const openDecision = (d: DecisionType, articleNo?: number) => {
		resetMotif();
		setSelectedArticleNo(articleNo ?? null);
		setDecision(d);
		// Le scroll est géré par le useEffect sur [decision]
	};

	// ── Rendu ─────────────────────────────────────────────────────────────────────

	if (loading) {
		return (
			<div className="p-6 flex items-center gap-3">
				<Icon icon="solar:refresh-bold" size={22} className="animate-spin" />
				<Text>Chargement de la validation...</Text>
			</div>
		);
	}

	return (
		<div className="p-3 md:p-4">
			{/* Ancre haut de page pour scroll programmatique */}
			<div ref={pageTopRef} />

			<div className="rounded-lg border border-border bg-card shadow-sm">
				{/* En-tête + barre d'actions */}
				<div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
					<div>
						<Title as="h5">Validation demande</Title>
						<Text color="secondary">
							{getBesoinNumero(besoin) || `B${String(besoinNo).padStart(7, "0")}`} — {getBesoinTitle(besoin)}
						</Text>
					</div>
					<ActionBar
						showValidatorActions={showValidatorActions}
						showBuyerActions={showBuyerActions}
						showTakeCharge={isAcheteur && !view.isAffected}
						showReleaseBuyer={showBuyerActions && isAffected}
						showDemandePrix={showBuyerActions && isDemandeAchat}
						showBonCommande={showBuyerActions && (isDemandeAchat || isBCAchat) && !retourObligatoire}
						submitting={submitting}
						onValidate={() => void submitValidation(Statut.Valide)}
						onRectify={() => openDecision("rectify")}
						onReject={() => openDecision("reject")}
						onTakeCharge={() => void takeInCharge(true)}
						onReleaseBuyer={() => void takeInCharge(false)}
						onDemandePrix={() => openAchatFlow(TypeSage.Demande_Achat)}
						onBonCommande={() => openAchatFlow(TypeSage.BC_Achat)}
						onClose={onBack}
					/>
				</div>

				<div className="space-y-4 p-4">
					{/* ══ PANNEAU MOTIF EN HAUT — affiché quand décision active ══ */}
					{decision && (
						<div ref={motifPanelRef}>
							<MotifPanel
								decision={decision}
								motifs={motifs}
								motifSelectId={motifSelectId}
								motifText={motifText}
								showExtra={showMotifExtra}
								submitting={submitting}
								articleNo={selectedArticleNo}
								onSelectMotif={setMotifSelectId}
								onChangeText={setMotifText}
								onToggleExtra={() => setShowMotifExtra((v) => !v)}
								onConfirm={() => {
									if (selectedArticleNo !== null) {
										void handleRejectArticle(selectedArticleNo);
									} else {
										void handleConfirmDecision();
									}
								}}
								onCancel={() => {
									setDecision(null);
									setSelectedArticleNo(null);
									resetMotif();
								}}
							/>
						</div>
					)}

					{/* Détails du besoin */}
					<Section title="Détails du besoin" icon="solar:info-circle-bold">
						<div className="grid gap-4 md:grid-cols-3">
							<Info label="N° demande" value={getBesoinNumero(besoin) || `B${String(besoinNo).padStart(7, "0")}`} />
							<Info label="Titre" value={getBesoinTitle(besoin)} />
							<Info label="Date" value={formatDate(asString(besoin?.B_Date ?? besoin?.b_Date))} />
							<Info
								label="Affaire"
								value={asString(besoin?.CA_Intitule ?? besoin?.cA_Intitule ?? besoin?.CA_Num ?? besoin?.cA_Num)}
							/>
							<Info label="Dépôt" value={asString(besoin?.DE_Intitule ?? besoin?.dE_Intitule)} />
							<Info
								label="Date livraison"
								value={formatDate(asString(besoin?.B_DateLivraison ?? besoin?.b_DateLivraison))}
							/>
							<Info label="Demandeur" value={asString(besoin?.B_Demandeur ?? besoin?.b_Demandeur)} />
							<Info
								label="État"
								value={
									ETAT_BESOIN_LABELS[currentEtat] || asString(besoin?.B_ValEtat_Besoin ?? besoin?.b_ValEtat_Besoin)
								}
							/>
							<ImportanceInfo value={asNumber(besoin?.B_DegreImportance ?? besoin?.b_DegreImportance)} />
						</div>
					</Section>

					{/* Articles demandés */}
					<Section title="Articles demandés" icon="solar:box-bold">
						<ArticleTable
							articles={articles}
							showActions={showValidatorActions && validationType !== Type_Validation.Retour_Demande_Validation}
							editingArticle={editingArticle}
							submitting={submitting}
							onStartEdit={(no, qty) => setEditingArticle({ no, qty })}
							onChangeEditQty={(qty) => setEditingArticle((prev) => (prev ? { ...prev, qty } : null))}
							onSaveEdit={() => void saveEditQuantity()}
							onCancelEdit={() => setEditingArticle(null)}
							onStartReject={(no) => openDecision("reject", no)}
						/>
					</Section>

					{/* Articles retour */}
					{validationType === Type_Validation.Retour_Demande_Validation && articlesRetour.length > 0 && (
						<Section title="Articles retour du besoin" icon="solar:reply-bold">
							<ArticleRetourTable articlesRetour={articlesRetour} />
						</Section>
					)}

					{/* Circuit de validation */}
					<Section title="Validateurs" icon="solar:users-group-rounded-bold">
						<ValidationCircuit circuit={circuit} currentValidationId={getValidationId(validation)} />
					</Section>
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Barre d'actions
// ─────────────────────────────────────────────────────────────────────────────

function ActionBar({
	showValidatorActions,
	showBuyerActions,
	showTakeCharge,
	showReleaseBuyer,
	showDemandePrix,
	showBonCommande,
	submitting,
	onValidate,
	onRectify,
	onReject,
	onTakeCharge,
	onReleaseBuyer,
	onDemandePrix,
	onBonCommande,
	onClose,
}: {
	showValidatorActions: boolean;
	showBuyerActions: boolean;
	showTakeCharge: boolean;
	showReleaseBuyer: boolean;
	showDemandePrix: boolean;
	showBonCommande: boolean;
	submitting: boolean;
	onValidate: () => void;
	onRectify: () => void;
	onReject: () => void;
	onTakeCharge: () => void;
	onReleaseBuyer: () => void;
	onDemandePrix: () => void;
	onBonCommande: () => void;
	onClose: () => void;
}) {
	return (
		<div className="flex flex-wrap justify-end gap-1.5">
			{showValidatorActions && (
				<>
					<Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={submitting} onClick={onValidate}>
						<Icon icon="solar:check-bold" size={14} />
						Valider
					</Button>
					<Button
						size="sm"
						style={{ backgroundColor: "#ff6b35", borderColor: "#ff6b35" }}
						className="hover:opacity-90"
						disabled={submitting}
						onClick={onRectify}
					>
						<Icon icon="solar:pen-bold" size={14} />
						Rectifier demande
					</Button>
					<Button size="sm" className="bg-red-600 hover:bg-red-700" disabled={submitting} onClick={onReject}>
						<Icon icon="solar:close-circle-bold" size={14} />
						Annuler
					</Button>
				</>
			)}
			{showTakeCharge && (
				<Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={submitting} onClick={onTakeCharge}>
					<Icon icon="solar:user-check-bold" size={14} />
					Pris en charge
				</Button>
			)}
			{showBuyerActions && (
				<>
					{showReleaseBuyer && (
						<Button
							size="sm"
							className="bg-slate-600 hover:bg-slate-700"
							disabled={submitting}
							onClick={onReleaseBuyer}
						>
							<Icon icon="solar:user-cross-bold" size={14} />
							Non pris en charge
						</Button>
					)}
					{showDemandePrix && (
						<Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={submitting} onClick={onDemandePrix}>
							<Icon icon="solar:add-circle-bold" size={14} />
							Demande de prix
						</Button>
					)}
					{showBonCommande && (
						<Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={submitting} onClick={onBonCommande}>
							<Icon icon="solar:document-add-bold" size={14} />
							Bon de commande achat
						</Button>
					)}
				</>
			)}
			<Button size="sm" variant="contrast" onClick={onClose}>
				<Icon icon="solar:close-circle-bold" size={14} />
				Fermer
			</Button>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
	const [open, setOpen] = useState(true);
	return (
		<Card className="rounded-lg gap-0 py-0">
			<CardHeader className="border-b px-3 py-2 cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
				<CardTitle className="flex items-center justify-between text-sm font-medium text-primary">
					<span className="flex items-center gap-2">
						<Icon icon={icon} size={16} />
						{title}
					</span>
					<Icon icon={open ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} size={14} />
				</CardTitle>
			</CardHeader>
			{open && <CardContent className="px-3 pb-3 pt-2">{children}</CardContent>}
		</Card>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Champ info lecture seule
// ─────────────────────────────────────────────────────────────────────────────

function Info({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<Text variant="caption" className="block font-medium text-text-secondary">
				{label}
			</Text>
			<div className="min-h-8 rounded border border-input bg-muted/40 px-3 py-1.5 text-sm">{value || "—"}</div>
		</div>
	);
}

function ImportanceInfo({ value }: { value: number }) {
	const labels: Record<number, string> = {
		0: "Non définie",
		1: "Basse",
		2: "Moyenne",
		3: "Haute",
		4: "Très haute",
		5: "Maximum",
	};
	return (
		<div className="space-y-1">
			<Text variant="caption" className="block font-medium text-text-secondary">
				Degré d'importance
			</Text>
			<div className="flex min-h-8 items-center gap-3">
				<div className="h-2 flex-1 rounded-full bg-muted">
					<div
						className="h-2 rounded-full bg-primary transition-all"
						style={{ width: `${Math.max(5, value * 20)}%` }}
					/>
				</div>
				<Text variant="caption" color="primary" className="min-w-17.5 text-right">
					{labels[value] || "—"}
				</Text>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Table des articles (avec actions inline)
// ─────────────────────────────────────────────────────────────────────────────

function ArticleTable({
	articles,
	showActions,
	editingArticle,
	submitting,
	onStartEdit,
	onChangeEditQty,
	onSaveEdit,
	onCancelEdit,
	onStartReject,
}: {
	articles: DA_BESOIN_ARTICLEDto[];
	showActions: boolean;
	editingArticle: { no: number; qty: number } | null;
	submitting: boolean;
	onStartEdit: (no: number, qty: number) => void;
	onChangeEditQty: (qty: number) => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
	onStartReject: (no: number) => void;
}) {
	const [clickedMotif, setClickedMotif] = useState<string | null>(null);

	const hasRejetedCol = articles.some((a) =>
		asString(
			(a as Record<string, unknown>).BA_ValidateurRejetArticle ??
				(a as Record<string, unknown>).bA_ValidateurRejetArticle,
		),
	);

	if (articles.length === 0) {
		return (
			<Text color="secondary" className="block py-4 text-center">
				Aucun article trouvé.
			</Text>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr className="border bg-muted/40 text-left">
						<th className="border px-2 py-2">Référence</th>
						<th className="border px-2 py-2">Désignation</th>
						<th className="border px-2 py-2 text-right">Quantité</th>
						<th className="border px-2 py-2 text-right">Qté validée</th>
						<th className="border px-2 py-2">Unité</th>
						{hasRejetedCol && <th className="border px-2 py-2">Rejeté par</th>}
						<th className="border px-2 py-2 text-center">État</th>
						{showActions && <th className="border px-2 py-2 text-center">Actions</th>}
					</tr>
				</thead>
				<tbody>
					{articles.map((article, index) => {
						const bANo = asNumber(article.BA_No ?? article.bA_No);
						const etat = asNumber(article.BA_Etat ?? article.bA_Etat);
						const qty = asNumber(article.BA_Quantite ?? article.bA_Quantite);
						const qtyVal = asNumber(article.BA_QuantiteValider ?? article.bA_QuantiteValider);
						const motif = asString(
							(article as Record<string, unknown>).BA_Motif ?? (article as Record<string, unknown>).bA_Motif,
						);
						const rejetePar = asString(
							(article as Record<string, unknown>).BA_ValidateurRejetArticle ??
								(article as Record<string, unknown>).bA_ValidateurRejetArticle,
						);
						const isEditing = editingArticle?.no === bANo;
						const etatInfo = ETAT_ARTICLE_ICON[etat];
						const isEditable = etat === Etat.EnAttente || etat === Etat.Valider;

						return (
							<Fragment key={bANo || index}>
								<tr
									className={`border-b cursor-pointer transition-colors ${
										clickedMotif && motif ? "bg-blue-50" : "hover:bg-muted/20"
									}`}
									onClick={() => {
										if (motif && motif !== "Aucun") {
											setClickedMotif((prev) => (prev === motif ? null : motif));
										} else {
											setClickedMotif(null);
										}
									}}
								>
									<td className="border px-2 py-2 text-primary underline cursor-pointer">
										{asString(article.BA_RefArticle ?? article.bA_RefArticle)}
									</td>
									<td className="border px-2 py-2">{asString(article.BA_DesigArticle ?? article.bA_DesigArticle)}</td>
									<td className="border px-2 py-2 text-right">{qty}</td>
									<td className="border px-2 py-2 text-right">
										{isEditing ? (
											<input
												type="number"
												className="w-20 rounded border border-primary px-1 py-0.5 text-right text-sm"
												value={editingArticle.qty}
												min={0.01}
												step={0.01}
												onChange={(e) => onChangeEditQty(Number(e.target.value))}
												onClick={(e) => e.stopPropagation()}
											/>
										) : (
											qtyVal
										)}
									</td>
									<td className="border px-2 py-2">{asString(article.BA_Unite ?? article.bA_Unite)}</td>
									{hasRejetedCol && <td className="border px-2 py-2 text-red-600">{rejetePar}</td>}
									<td className="border px-2 py-2 text-center">
										{etatInfo ? (
											<span
												title={etatInfo.label}
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: 4,
													background: `${etatInfo.color}20`,
													color: etatInfo.color,
													borderRadius: 6,
													padding: "2px 8px",
													fontSize: 11,
													fontWeight: 600,
												}}
											>
												<Icon icon={etatInfo.icon} size={13} />
												{etatInfo.label}
											</span>
										) : (
											<span>{etat}</span>
										)}
									</td>
									{showActions && (
										<td className="border px-2 py-2">
											<div className="flex justify-center gap-1">
												{isEditing ? (
													<>
														<button
															type="button"
															disabled={submitting}
															title="Enregistrer"
															className="rounded border border-green-500 p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
															onClick={(e) => {
																e.stopPropagation();
																onSaveEdit();
															}}
														>
															<Icon icon="solar:check-circle-bold" size={15} />
														</button>
														<button
															type="button"
															title="Annuler"
															className="rounded border border-gray-300 p-1 text-gray-500 hover:bg-gray-50"
															onClick={(e) => {
																e.stopPropagation();
																onCancelEdit();
															}}
														>
															<Icon icon="solar:close-circle-bold" size={15} />
														</button>
													</>
												) : (
													<>
														{isEditable && (
															<button
																type="button"
																disabled={submitting}
																title="Modifier la quantité"
																className="rounded border border-blue-300 p-1 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
																onClick={(e) => {
																	e.stopPropagation();
																	onStartEdit(bANo, qtyVal || qty);
																}}
															>
																<Icon icon="solar:pen-bold" size={15} />
															</button>
														)}
														{isEditable && (
															<button
																type="button"
																disabled={submitting}
																title="Rejeter l'article"
																className="rounded border border-red-300 p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
																onClick={(e) => {
																	e.stopPropagation();
																	onStartReject(bANo);
																}}
															>
																<Icon icon="solar:close-circle-bold" size={15} />
															</button>
														)}
													</>
												)}
											</div>
										</td>
									)}
								</tr>
								{clickedMotif && motif === clickedMotif && (
									<tr key={`motif-${bANo}`}>
										<td
											colSpan={showActions ? (hasRejetedCol ? 8 : 7) : hasRejetedCol ? 7 : 6}
											className="border-b bg-red-50 px-4 py-2"
										>
											<span className="font-semibold text-red-700">Motif : </span>
											<span className="text-red-600">{motif}</span>
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Table articles retour
// ─────────────────────────────────────────────────────────────────────────────

function ArticleRetourTable({ articlesRetour }: { articlesRetour: ArticleRetour[] }) {
	if (articlesRetour.length === 0) {
		return (
			<Text color="secondary" className="block py-4 text-center">
				Aucun article retour.
			</Text>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr className="border bg-muted/40 text-left">
						<th className="border px-2 py-2">Article</th>
						<th className="border px-2 py-2 text-right">Quantité validée</th>
						<th className="border px-2 py-2">Unité</th>
						<th className="border px-2 py-2 text-right">Montant HT</th>
						<th className="border px-2 py-2 text-right">Montant TTC</th>
						<th className="border px-2 py-2 text-center">État</th>
					</tr>
				</thead>
				<tbody>
					{articlesRetour.map((a, i) => {
						const etatRetour = asNumber(a.AD_EtatRetour ?? a.aD_EtatRetour);
						const etatInfo = ETAT_RETOUR_ICON[etatRetour];
						const rowKey = asString(a.AD_No ?? a.aD_No ?? a.BA_No ?? a.bA_No) || String(i);
						return (
							<tr key={rowKey} className="border-b hover:bg-muted/20">
								<td className="border px-2 py-2">
									{asString(a.AR_Article ?? a.aR_Article ?? a.BA_RefArticle ?? a.bA_RefArticle)}
								</td>
								<td className="border px-2 py-2 text-right">
									{asString(a.BA_QuantiteValider ?? a.bA_QuantiteValider)}
								</td>
								<td className="border px-2 py-2">{asString(a.BA_Unite ?? a.bA_Unite)}</td>
								<td className="border px-2 py-2 text-right">{asString(a.LP_MontantHT ?? a.lP_MontantHT)}</td>
								<td className="border px-2 py-2 text-right">{asString(a.LP_MontantTTC ?? a.lP_MontantTTC)}</td>
								<td className="border px-2 py-2 text-center">
									{etatInfo ? (
										<span
											title={etatInfo.label}
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												background: `${etatInfo.color}20`,
												color: etatInfo.color,
												borderRadius: 6,
												padding: "2px 8px",
												fontSize: 11,
												fontWeight: 600,
											}}
										>
											<Icon icon={etatInfo.icon} size={13} />
											{etatInfo.label}
										</span>
									) : (
										<span>{etatRetour}</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Panneau de saisie motif (décision) — affiché EN HAUT du contenu
// ─────────────────────────────────────────────────────────────────────────────

function MotifPanel({
	decision,
	motifs,
	motifSelectId,
	motifText,
	showExtra,
	submitting,
	articleNo,
	onSelectMotif,
	onChangeText,
	onToggleExtra,
	onConfirm,
	onCancel,
}: {
	decision: DecisionType;
	motifs: MotifItem[];
	motifSelectId: number;
	motifText: string;
	showExtra: boolean;
	submitting: boolean;
	articleNo: number | null;
	onSelectMotif: (id: number) => void;
	onChangeText: (v: string) => void;
	onToggleExtra: () => void;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const isReject = decision === "reject";
	const borderColor = isReject ? "border-red-200" : "border-orange-200";
	const bgColor = isReject ? "bg-red-50" : "bg-orange-50";
	const titleColor = isReject ? "text-red-700" : "text-orange-700";
	const confirmBtnClass = isReject ? "bg-red-600 hover:bg-red-700" : "bg-orange-500 hover:bg-orange-600";
	const icon = isReject ? "solar:close-circle-bold" : "solar:pen-bold";

	const title =
		articleNo !== null
			? "Motif de rejet de l'article"
			: isReject
				? "Motif d'annulation de la demande"
				: "Motif de rectification de la demande";

	return (
		<div className={`rounded-md border ${borderColor} ${bgColor} p-4 space-y-3 shadow-sm`}>
			{/* En-tête du panneau */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Icon icon={icon} size={18} className={titleColor} />
					<Text variant="subTitle2" className={titleColor}>
						{title}
					</Text>
				</div>
				<button type="button" onClick={onCancel} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Fermer">
					<Icon icon="solar:close-circle-bold" size={18} />
				</button>
			</div>

			{/* Dropdown motifs prédéfinis */}
			{motifs.length > 0 && (
				<div className="space-y-1">
					<Text variant="caption" className="font-medium">
						{isReject ? "Motif d'annulation *" : "Motif de rectification *"}
					</Text>
					<select
						className="w-full rounded border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						value={motifSelectId}
						onChange={(e) => onSelectMotif(Number(e.target.value))}
					>
						<option value={0}>— Sélectionner un motif —</option>
						{motifs.map((m) => (
							<option key={m.Value ?? m.value} value={m.Value ?? m.value}>
								{m.Text ?? m.text}
							</option>
						))}
					</select>
				</div>
			)}

			{/* Lien pour afficher champ texte supplémentaire */}
			<button type="button" onClick={onToggleExtra} className="text-sm text-primary underline hover:no-underline">
				{showExtra ? "— Masquer" : "+ Plus d'explication"}
			</button>

			{/* Texte libre */}
			{(showExtra || motifs.length === 0) && (
				<div className="space-y-1">
					<Text variant="caption" className="font-medium">
						{motifs.length === 0 ? "Motif *" : "Explication détaillée"}
					</Text>
					<Textarea
						value={motifText}
						rows={3}
						placeholder="Saisir un motif..."
						onChange={(e) => onChangeText(e.target.value)}
					/>
				</div>
			)}

			<div className="flex gap-2 justify-end pt-1">
				<Button variant="outline" disabled={submitting} onClick={onCancel}>
					Annuler
				</Button>
				<Button className={confirmBtnClass} disabled={submitting} onClick={onConfirm}>
					{submitting ? "En cours..." : "Confirmer"}
				</Button>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit de validation (avec badges colorés + dates)
// ─────────────────────────────────────────────────────────────────────────────

function ValidationCircuit({
	circuit,
	currentValidationId,
}: {
	circuit: Validateur_BesoinVM[];
	currentValidationId: number;
}) {
	const [tooltip, setTooltip] = useState<string | null>(null);

	// Dédupliquer par userId : si un même utilisateur apparaît plusieurs fois
	// (ex: Demandeur + Validateur), on garde uniquement la DERNIÈRE occurrence
	// (statut le plus avancé dans le circuit)
	const deduplicatedCircuit = (() => {
		const seen = new Map<string, number>(); // userId → index dans le tableau final
		const result: Validateur_BesoinVM[] = [];

		for (const row of circuit) {
			const userId = asString(
				(row as Record<string, unknown>).US_UserId ??
					(row as Record<string, unknown>).uS_UserId ??
					(row as Record<string, unknown>).V_ValidatorUserId ??
					(row as Record<string, unknown>).v_ValidatorUserId ??
					row.US_UserIntitule ??
					row.uS_UserIntitule,
			);

			if (userId && seen.has(userId)) {
				// Remplacer l'occurrence précédente par celle-ci (plus avancée)
				const existingIndex = seen.get(userId)!;
				result[existingIndex] = row;
			} else {
				const newIndex = result.length;
				result.push(row);
				if (userId) seen.set(userId, newIndex);
			}
		}

		return result;
	})();

	if (deduplicatedCircuit.length === 0) {
		return (
			<Text color="secondary" className="block py-4 text-center">
				Aucun circuit trouvé.
			</Text>
		);
	}

	return (
		<div className="overflow-x-auto py-4">
			<div className="flex min-w-130 items-start justify-center gap-0">
				{deduplicatedCircuit.map((row, index) => {
					const rowId = asNumber(row.V_Id ?? row.v_Id);
					const status = asNumber(row.V_Status ?? row.v_Status);
					const role = asNumber(row.V_Role_Validateur ?? row.v_Role_Validateur);
					const label =
						asString(row.US_UserIntitule ?? row.uS_UserIntitule) ||
						ROLE_VALIDATEUR_LABELS[role] ||
						`Niveau ${index + 1}`;
					const isActive = rowId === currentValidationId || status === Statut.Valide;
					const isRejected = status === Statut.Rejete || status === Statut.Rectifier_Demande;
					const roleBgColor = ROLE_BADGE_COLOR[role] ?? "#6c757d";
					const statutColors = STATUT_BADGE_COLOR[status];
					const initials = getInitials(label);
					const avatarColor = getColorFromName(label);
					const notifDate = formatDate(asString(row.NU_DateTime ?? row.nU_DateTime));
					const valDate = formatDate(asString(row.V_ValidationDate ?? row.v_ValidationDate));
					const tooltipKey = `${rowId}-${index}`;

					return (
						<div key={tooltipKey} className="flex flex-1 items-start">
							<div className="flex flex-1 flex-col items-center">
								<button
									type="button"
									className="relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition-transform hover:scale-110 focus:outline-none"
									style={{
										backgroundColor: isRejected ? "#dc3545" : isActive ? avatarColor : "#adb5bd",
										border: `2px solid ${isActive ? avatarColor : "#dee2e6"}`,
									}}
									title={`${label} — cliquez pour les dates`}
									onClick={() => setTooltip((prev) => (prev === tooltipKey ? null : tooltipKey))}
								>
									{initials}
									{isRejected && (
										<span
											className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white"
											style={{ fontSize: 9 }}
										>
											✕
										</span>
									)}
									{isActive && !isRejected && (
										<span
											className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white"
											style={{ fontSize: 9 }}
										>
											✓
										</span>
									)}
								</button>

								<Text variant="caption" color="secondary" className="mt-2 text-center max-w-22.5 leading-tight">
									{label}
								</Text>

								<span
									className="mt-1 rounded-full px-2 py-0.5 text-white"
									style={{
										backgroundColor: roleBgColor,
										fontSize: 9,
										fontWeight: 600,
									}}
								>
									{ROLE_VALIDATEUR_LABELS[role] ?? "—"}
								</span>

								{statutColors && (
									<span
										className="mt-1 rounded-full px-2 py-0.5"
										style={{
											backgroundColor: statutColors.bg,
											color: statutColors.text,
											fontSize: 9,
											fontWeight: 600,
										}}
									>
										{STATUT_LABELS[status] ?? ""}
									</span>
								)}

								{tooltip === tooltipKey && (notifDate || valDate) && (
									<div className="mt-2 rounded border border-border bg-white p-2 shadow text-xs space-y-1">
										{notifDate && (
											<div>
												<span className="font-semibold">Notifié : </span>
												{notifDate}
											</div>
										)}
										{valDate && (
											<div>
												<span className="font-semibold">Validé : </span>
												{valDate}
											</div>
										)}
									</div>
								)}
							</div>

							{index < deduplicatedCircuit.length - 1 && (
								<div
									className="mt-5 h-0.5 flex-1"
									style={{
										backgroundColor: isActive ? avatarColor : "#dee2e6",
									}}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
