import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@/components/icon";
import { articleBesoinService, besoinService, validationService } from "@/services/besoinservice";
import {
	type DA_BESOIN_ARTICLEDto,
	type DA_BESOINDto,
	type DA_VALIDATION,
	Etat_Besoin,
	EtatBesoinRetour,
	Statut,
	Type_Validation,
	TypeSage,
	type Validateur_BesoinVM,
} from "@/types/besoin";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";
import { ETAT_BESOIN_LABELS, formatDate, ROLE_VALIDATEUR_LABELS, STATUT_LABELS } from "@/utils/besoin.utils";

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

const importanceLabels: Record<number, string> = {
	0: "Non definie",
	1: "Basse",
	2: "Moyenne",
	3: "Haute",
	4: "Tres haute",
	5: "Maximum",
};

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown) => {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : 0;
};

const asString = (value: unknown) => (value == null ? "" : String(value));

const asBool = (value: unknown) => value === true || value === "true" || value === 1 || value === "1";

const getField = <T,>(record: Record<string, unknown>, ...keys: string[]): T | undefined => {
	for (const key of keys) {
		const value = record[key];
		if (value !== undefined && value !== null) return value as T;
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

const getBesoinNo = (besoin?: DA_BESOINDto) => asNumber(besoin?.B_No ?? besoin?.b_No);
const getBesoinTitle = (besoin?: DA_BESOINDto) => asString(besoin?.B_Titre ?? besoin?.b_Titre);
const getBesoinNumero = (besoin?: DA_BESOINDto) => asString(besoin?.B_Numero ?? besoin?.b_Numero);
const getValidationId = (validation?: DA_VALIDATION) => asNumber(validation?.V_Id ?? validation?.v_Id);
const getValidationStatus = (validation?: DA_VALIDATION) => asNumber(validation?.V_Status ?? validation?.v_Status);
const getValidationType = (validation?: DA_VALIDATION) =>
	(validation?.V_Type ?? validation?.v_Type ?? Type_Validation.Demande_Besoin) as Type_Validation;
const getValidationAcheteur = (validation?: DA_VALIDATION) => asBool(validation?.V_Acheteur ?? validation?.v_Acheteur);

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
	const [circuit, setCircuit] = useState<Validateur_BesoinVM[]>([]);
	const [decision, setDecision] = useState<"reject" | "rectify" | null>(null);
	const [motif, setMotif] = useState("");

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

	const loadValidation = useCallback(async () => {
		setLoading(true);
		try {
			const [viewResponse, articlesResponse] = await Promise.all([
				validationService.getValidationView(validationId, besoinId),
				articleBesoinService.getByBesoinId(besoinId).catch(() => []),
			]);
			const normalized = normalizeValidationView(viewResponse);
			if (!normalized.besoin && besoinId > 0) {
				normalized.besoin = await besoinService.getById(besoinId);
			}
			setView(normalized);
			setArticles(Array.isArray(articlesResponse) ? articlesResponse : []);

			const typeId = asNumber(normalized.besoin?.BT_Id ?? normalized.besoin?.bT_Id);
			const demandeurId = asString(normalized.besoin?.B_IdDemandeur ?? normalized.besoin?.b_IdDemandeur);
			if (typeId && demandeurId) {
				const rows = await validationService.getCircuit(
					typeId,
					besoinId,
					demandeurId,
					getValidationType(normalized.validation),
				);
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

	const validationPayload = useMemo<DA_VALIDATION | null>(() => {
		if (!validation) return null;
		return {
			...validation,
			V_Id: getValidationId(validation),
			DA_BesoinId: besoinNo,
			V_ValidatorUserId: asString(validation.V_ValidatorUserId ?? validation.v_ValidatorUserId),
			V_Acheteur: getValidationAcheteur(validation),
			V_Type: validationType,
		};
	}, [besoinNo, validation, validationType]);

	const submitValidation = async (status: Statut, statusMotif = "") => {
		if (!validationPayload) return;
		if ((status === Statut.Rejete || status === Statut.Rectifier_Demande) && !statusMotif.trim()) {
			toast.error("Veuillez saisir un motif.");
			return;
		}
		setSubmitting(true);
		try {
			await validationService.validerEtape({
				...validationPayload,
				V_Status: status,
				V_Motif: statusMotif.trim(),
			});
			toast.success("Validation enregistree.");
			onBack();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur pendant la validation.");
		} finally {
			setSubmitting(false);
		}
	};

	const takeInCharge = async (typeValidation = true) => {
		setSubmitting(true);
		try {
			await validationService.affectationAcheteur(besoinNo, typeValidation);
			toast.success(typeValidation ? "Demande prise en charge." : "Demande liberee.");
			await loadValidation();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Impossible de mettre a jour la prise en charge.");
		} finally {
			setSubmitting(false);
		}
	};

	const openAchatFlow = (type: TypeSage) => {
		window.location.href = `/besoins?mode=affectation&id=${besoinNo}&type=${type}&v_Id=${getValidationId(validation)}`;
	};

	if (loading) {
		return (
			<div className="p-6 flex items-center gap-3">
				<Icon icon="solar:refresh-bold" size={22} />
				<Text>Chargement de la validation...</Text>
			</div>
		);
	}

	return (
		<div className="p-3 md:p-4">
			<div className="rounded-lg border border-border bg-card shadow-sm">
				<div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
					<div>
						<Title as="h5">Validation demande</Title>
						<Text color="secondary">
							{getBesoinNumero(besoin) || `B${String(besoinNo).padStart(7, "0")}`} {getBesoinTitle(besoin)}
						</Text>
					</div>
					<ActionBar
						showValidatorActions={showValidatorActions}
						showBuyerActions={showBuyerActions}
						showTakeCharge={isAcheteur && !validationPayload}
						showReleaseBuyer={showBuyerActions && isAffected}
						showDemandePrix={showBuyerActions && isDemandeAchat}
						showBonCommande={showBuyerActions && (isDemandeAchat || isBCAchat) && !retourObligatoire}
						submitting={submitting}
						onValidate={() => void submitValidation(Statut.Valide)}
						onRectify={() => setDecision("rectify")}
						onReject={() => setDecision("reject")}
						onTakeCharge={() => void takeInCharge(true)}
						onReleaseBuyer={() => void takeInCharge(false)}
						onDemandePrix={() => openAchatFlow(TypeSage.Demande_Achat)}
						onBonCommande={() => openAchatFlow(TypeSage.BC_Achat)}
						onClose={onBack}
					/>
				</div>

				<div className="space-y-4 p-4">
					<Section title="Details du besoin" icon="solar:info-circle-bold">
						<div className="grid gap-4 md:grid-cols-3">
							<Info label="N demande" value={getBesoinNumero(besoin) || `B${String(besoinNo).padStart(7, "0")}`} />
							<Info label="Titre" value={getBesoinTitle(besoin)} />
							<Info label="Date" value={formatDate(asString(besoin?.B_Date ?? besoin?.b_Date))} />
							<Info
								label="Affaire"
								value={asString(besoin?.CA_Intitule ?? besoin?.cA_Intitule ?? besoin?.CA_Num ?? besoin?.cA_Num)}
							/>
							<Info label="Depot" value={asString(besoin?.DE_Intitule ?? besoin?.dE_Intitule)} />
							<Info
								label="Date de livraison"
								value={formatDate(asString(besoin?.B_DateLivraison ?? besoin?.b_DateLivraison))}
							/>
							<Info label="Demandeur" value={asString(besoin?.B_Demandeur ?? besoin?.b_Demandeur)} />
							<Info
								label="Etat"
								value={
									ETAT_BESOIN_LABELS[currentEtat] || asString(besoin?.B_ValEtat_Besoin ?? besoin?.b_ValEtat_Besoin)
								}
							/>
							<ImportanceInfo value={asNumber(besoin?.B_DegreImportance ?? besoin?.b_DegreImportance)} />
						</div>
					</Section>

					<Section title="Articles demandes" icon="solar:box-bold">
						<ArticleTable articles={articles} showActions={showValidatorActions} />
					</Section>

					<Section title="Validateurs" icon="solar:users-group-rounded-bold">
						<ValidationCircuit circuit={circuit} currentValidationId={getValidationId(validation)} />
					</Section>

					{decision && (
						<div className="rounded-md border bg-bg-neutral p-3 space-y-3">
							<Text variant="subTitle2">{decision === "reject" ? "Motif d'annulation" : "Motif de rectification"}</Text>
							<Textarea value={motif} onChange={(event) => setMotif(event.target.value)} />
							<div className="flex gap-2 justify-end">
								<Button variant="outline" disabled={submitting} onClick={() => setDecision(null)}>
									Fermer
								</Button>
								<Button
									disabled={submitting}
									onClick={() =>
										void submitValidation(decision === "reject" ? Statut.Rejete : Statut.Rectifier_Demande, motif)
									}
								>
									Confirmer
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

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
					<Button size="sm" className="bg-red-600 hover:bg-red-700" disabled={submitting} onClick={onRectify}>
						<Icon icon="solar:pen-bold" size={14} />
						Rectifier demande
					</Button>
					<Button size="sm" className="bg-amber-500 hover:bg-amber-600" disabled={submitting} onClick={onReject}>
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

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
	return (
		<Card className="rounded-lg gap-3 py-0">
			<CardHeader className="border-b px-3 py-2">
				<CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
					<Icon icon={icon} size={16} />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="px-3 pb-3">{children}</CardContent>
		</Card>
	);
}

function Info({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<Text variant="caption" className="block font-medium">
				{label}
			</Text>
			<div className="min-h-8 rounded border border-input bg-muted/40 px-3 py-1.5 text-sm text-text-secondary">
				{value || "-"}
			</div>
		</div>
	);
}

function ImportanceInfo({ value }: { value: number }) {
	return (
		<div className="space-y-1">
			<Text variant="caption" className="block font-medium">
				Degre d'importance
			</Text>
			<div className="flex min-h-8 items-center gap-3">
				<div className="h-2 flex-1 rounded-full bg-muted">
					<div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(5, value * 20)}%` }} />
				</div>
				<Text variant="caption" color="primary">
					{importanceLabels[value] || "-"}
				</Text>
			</div>
		</div>
	);
}

function ArticleTable({ articles, showActions }: { articles: DA_BESOIN_ARTICLEDto[]; showActions: boolean }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr className="border bg-muted/40 text-left">
						<th className="border px-2 py-2">Reference article</th>
						<th className="border px-2 py-2">Designation article</th>
						<th className="border px-2 py-2 text-right">Quantite</th>
						<th className="border px-2 py-2 text-right">Quantite valide</th>
						<th className="border px-2 py-2">Unite</th>
						<th className="border px-2 py-2 text-center">Etat</th>
						{showActions && <th className="border px-2 py-2 text-center">Actions</th>}
					</tr>
				</thead>
				<tbody>
					{articles.length === 0 && (
						<tr>
							<td colSpan={showActions ? 7 : 6} className="border py-6 text-center text-text-secondary">
								Aucun article trouve.
							</td>
						</tr>
					)}
					{articles.map((article, index) => {
						const etat = asNumber(article.BA_Etat ?? article.bA_Etat);
						return (
							<tr key={asNumber(article.BA_No ?? article.bA_No) || index} className="border-b">
								<td className="border px-2 py-2 text-primary underline">
									{asString(article.BA_RefArticle ?? article.bA_RefArticle)}
								</td>
								<td className="border px-2 py-2">{asString(article.BA_DesigArticle ?? article.bA_DesigArticle)}</td>
								<td className="border px-2 py-2 text-right">{asNumber(article.BA_Quantite ?? article.bA_Quantite)}</td>
								<td className="border px-2 py-2 text-right">
									{asNumber(article.BA_QuantiteValider ?? article.bA_QuantiteValider)}
								</td>
								<td className="border px-2 py-2">{asString(article.BA_Unite ?? article.bA_Unite)}</td>
								<td className="border px-2 py-2 text-center">
									<Badge variant={etat === 1 ? "success" : etat === 2 ? "destructive" : "warning"} shape="circle">
										<Icon
											icon={
												etat === 1
													? "solar:check-bold"
													: etat === 2
														? "solar:close-circle-bold"
														: "solar:clock-circle-bold"
											}
										/>
									</Badge>
								</td>
								{showActions && (
									<td className="border px-2 py-2">
										<div className="flex justify-center gap-1">
											<Button size="icon" variant="outline" className="h-7 w-7">
												<Icon icon="solar:pen-bold" size={14} />
											</Button>
											<Button size="icon" className="h-7 w-7 bg-amber-500 hover:bg-amber-600">
												<Icon icon="solar:close-circle-bold" size={14} />
											</Button>
										</div>
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function ValidationCircuit({
	circuit,
	currentValidationId,
}: {
	circuit: Validateur_BesoinVM[];
	currentValidationId: number;
}) {
	if (circuit.length === 0) {
		return (
			<Text color="secondary" className="block py-4 text-center">
				Aucun circuit trouve.
			</Text>
		);
	}

	return (
		<div className="overflow-x-auto py-6">
			<div className="flex min-w-[520px] items-start justify-center">
				{circuit.map((row, index) => {
					const rowId = asNumber(row.V_Id ?? row.v_Id);
					const status = asNumber(row.V_Status ?? row.v_Status);
					const active = rowId === currentValidationId || status === Statut.Valide;
					const role = asNumber(row.V_Role_Validateur ?? row.v_Role_Validateur);
					const level = asNumber(row.V_Niveau ?? row.v_Niveau ?? row.V_Niveau_Validation ?? row.v_Niveau_Validation);
					const label =
						asString(row.US_UserIntitule ?? row.uS_UserIntitule) ||
						asString(row.RO_Intitule ?? row.rO_Intitule) ||
						ROLE_VALIDATEUR_LABELS[role] ||
						`Validateur ${index + 1}`;
					return (
						<div
							key={`${rowId || asString(row.US_Id ?? row.uS_Id) || label}-${level || role}`}
							className="flex flex-1 items-start"
						>
							<div className="flex flex-1 flex-col items-center">
								<div
									className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${
										active ? "bg-cyan-500" : "bg-gray-500"
									}`}
								>
									{index + 1}
								</div>
								<Text variant="caption" color="secondary" className="mt-2 text-center">
									{label}
								</Text>
								<Text variant="caption" color="secondary" className="mt-1 text-center">
									{STATUT_LABELS[status] || ""}
								</Text>
							</div>
							{index < circuit.length - 1 && <div className="mt-4 h-px flex-1 bg-border" />}
						</div>
					);
				})}
			</div>
		</div>
	);
}
