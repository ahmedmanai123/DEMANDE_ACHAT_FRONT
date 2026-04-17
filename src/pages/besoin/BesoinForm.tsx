import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tabs, Tag, Upload, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useUserInfo } from "@/store/userStore";
import * as besoinService from "@/services/besoinService";
import type {
	IAffaire,
	IBesoin,
	IBesoinArticle,
	IBesoinType,
	IDepot,
	IValidateurBesoin,
	Type_Validation,
} from "@/types/besoin";

const { Option } = Select;
const { TextArea } = Input;

interface Props {
	b_No: number;
	onBack: () => void;
}

const STATUT_COLORS: Record<number, string> = {
	0: "default",
	1: "red",
	2: "orange",
	3: "green",
	4: "blue",
	5: "purple",
	6: "volcano",
};

const STATUT_LABELS: Record<number, string> = {
	0: "En attente",
	1: "Rejete",
	2: "Validation partielle",
	3: "Valide",
	4: "Attente acheteur",
	5: "Achete",
	6: "Rectification",
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

const normalizeBesoin = (raw: unknown): IBesoin | null => {
	if (!raw || typeof raw !== "object") return null;
	const record = raw as Record<string, unknown>;
	const wrapped = record.besoin;
	if (wrapped && typeof wrapped === "object") return wrapped as IBesoin;
	return record as IBesoin;
};

const normalizeValidateurs = (raw: unknown): IValidateurBesoin[] => {
	if (Array.isArray(raw)) return raw as IValidateurBesoin[];
	if (raw && typeof raw === "object") {
		const record = raw as Record<string, unknown>;
		if (Array.isArray(record.data)) return record.data as IValidateurBesoin[];
	}
	return [];
};

export default function BesoinForm({ b_No, onBack }: Props) {
	const [form] = Form.useForm();
	const [articleForm] = Form.useForm();
	const userInfo = useUserInfo();

	const [loading, setLoading] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [besoin, setBesoin] = useState<IBesoin | null>(null);
	const [editingArticle, setEditingArticle] = useState<IBesoinArticle | null>(null);

	const [typesBesoin, setTypesBesoin] = useState<IBesoinType[]>([]);
	const [depots, setDepots] = useState<IDepot[]>([]);
	const [affaires, setAffaires] = useState<IAffaire[]>([]);
	const [articles, setArticles] = useState<IBesoinArticle[]>([]);
	const [validateurs, setValidateurs] = useState<IValidateurBesoin[]>([]);

	const currentDemandeurId = useMemo(() => asString(userInfo?.id), [userInfo?.id]);

	const loadArticleRows = async (id: number) => {
		const rows = await besoinService.getBesoinArticles(id);
		setArticles(Array.isArray(rows) ? rows : []);
	};

	const loadTypeLists = async () => {
		try {
			const rows = await besoinService.getTypesBesoinUsers();
			setTypesBesoin(Array.isArray(rows) ? rows : []);
		} catch {
			setTypesBesoin([]);
		}
	};

	const loadLookupByType = async (typeId: number, demandeurId: string) => {
		if (!typeId || !demandeurId) return;
		const [depotsRows, affairesRows] = await Promise.all([
			besoinService.getDepotsAutoriser(typeId, demandeurId),
			besoinService.getAffairesAutoriser(typeId),
		]);
		setDepots(Array.isArray(depotsRows) ? depotsRows : []);
		setAffaires(Array.isArray(affairesRows) ? affairesRows : []);
	};

	const loadCircuit = async (
		typeId: number,
		besoinId: number,
		demandeurId: string,
		vType: Type_Validation = 0 as Type_Validation,
	) => {
		if (!typeId || !demandeurId) {
			setValidateurs([]);
			return;
		}
		const rows = await besoinService.getCircuitValidation(typeId, besoinId, demandeurId, Number(vType));
		setValidateurs(normalizeValidateurs(rows));
	};

	const loadNumero = async () => {
		const data = await besoinService.getLastNumero();
		form.setFieldValue("b_Numero", data?.numero || "");
	};

	const loadCreateMode = async () => {
		form.resetFields();
		setBesoin(null);
		setArticles([]);
		setValidateurs([]);
		setDepots([]);
		setAffaires([]);
		setFiles([]);
		articleForm.resetFields();
		setEditingArticle(null);

		if (currentDemandeurId) {
			form.setFieldValue("b_IdDemandeur", currentDemandeurId);
		}
		await Promise.all([loadNumero(), loadTypeLists()]);
	};

	const loadEditMode = async (id: number) => {
		setFiles([]);
		articleForm.resetFields();
		setEditingArticle(null);
		await loadTypeLists();

		const raw = await besoinService.getBesoinById(id);
		const besoinData = normalizeBesoin(raw);
		if (!besoinData) return;

		setBesoin(besoinData);
		form.setFieldsValue(besoinData);
		await loadArticleRows(id);

		const typeId = asNumber(besoinData.bT_Id ?? besoinData.BT_Id);
		const demandeurId = asString(besoinData.b_IdDemandeur ?? besoinData.B_IdDemandeur ?? currentDemandeurId);
		if (typeId && demandeurId) {
			await Promise.all([loadLookupByType(typeId, demandeurId), loadCircuit(typeId, id, demandeurId)]);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (b_No > 0) {
			void loadEditMode(b_No);
			return;
		}
		void loadCreateMode();
	}, [b_No, currentDemandeurId]);

	const onBesoinTypeChange = async (value: number) => {
		const demandeurId = asString(form.getFieldValue("b_IdDemandeur") || currentDemandeurId);
		if (!value || !demandeurId) return;
		await Promise.all([loadLookupByType(value, demandeurId), loadCircuit(value, b_No, demandeurId)]);
	};

	const handleSaveBesoin = async (values: Record<string, unknown>) => {
		setLoading(true);
		try {
			const payload: Record<string, unknown> = {
				...values,
				b_No: b_No || asNumber(values.b_No),
				b_IdDemandeur: asString(values.b_IdDemandeur || currentDemandeurId),
			};

			await besoinService.saveBesoin(payload, files);
			message.success("Demande enregistree avec succes.");
			onBack();
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Erreur lors de l'enregistrement.";
			message.error(msg);
		} finally {
			setLoading(false);
		}
	};

	const handleConfirmer = async () => {
		if (!b_No) return;
		try {
			await besoinService.confirmerBesoin(b_No);
			message.success("Demande confirmee.");
			onBack();
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Erreur lors de la confirmation.";
			message.error(msg);
		}
	};

	const handleSaveArticle = async () => {
		if (!b_No) {
			message.warning("Enregistrez d'abord la demande avant d'ajouter des articles.");
			return;
		}

		const values = await articleForm.validateFields();
		const articleId = asNumber(editingArticle?.bA_No ?? editingArticle?.BA_No);
		const payload = {
			...editingArticle,
			...values,
			bA_No: articleId,
			b_BesoinId: b_No,
		};

		try {
			await besoinService.saveArticleBesoin(payload);
			message.success("Article enregistre.");
			articleForm.resetFields();
			setEditingArticle(null);
			await loadArticleRows(b_No);
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'article.";
			message.error(msg);
		}
	};

	const handleDeleteArticle = async (articleNo: number) => {
		try {
			await besoinService.deleteArticleBesoin(articleNo);
			if (b_No) await loadArticleRows(b_No);
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Erreur lors de la suppression.";
			message.error(msg);
		}
	};

	const articleColumns = [
		{ title: "Reference", dataIndex: "bA_RefArticle", key: "bA_RefArticle", width: 140 },
		{ title: "Designation", dataIndex: "bA_DesigArticle", key: "bA_DesigArticle" },
		{ title: "Quantite", dataIndex: "bA_Quantite", key: "bA_Quantite", width: 110 },
		{ title: "Qte validee", dataIndex: "bA_QuantiteValider", key: "bA_QuantiteValider", width: 120 },
		{ title: "Unite", dataIndex: "bA_Unite", key: "bA_Unite", width: 90 },
		{
			title: "Actions",
			key: "actions",
			width: 120,
			render: (_: unknown, row: IBesoinArticle) => {
				const rowId = asNumber(row.bA_No ?? row.BA_No);
				return (
					<Space>
						<Button
							size="small"
							onClick={() => {
								setEditingArticle(row);
								articleForm.setFieldsValue(row);
							}}
						>
							Modifier
						</Button>
						<Popconfirm title="Supprimer cet article ?" onConfirm={() => void handleDeleteArticle(rowId)}>
							<Button size="small" danger icon={<DeleteOutlined />} />
						</Popconfirm>
					</Space>
				);
			},
		},
	];

	const validationColumns = [
		{ title: "Niveau", dataIndex: "v_Niveau", key: "v_Niveau", width: 80 },
		{ title: "Validateur", dataIndex: "uS_UserIntitule", key: "uS_UserIntitule" },
		{ title: "Role", dataIndex: "rO_Intitule", key: "rO_Intitule" },
		{
			title: "Statut",
			dataIndex: "v_Status",
			key: "v_Status",
			render: (value: number, row: IValidateurBesoin) => (
				<Tag color={STATUT_COLORS[value] ?? "default"}>
					{row.v_ValStatus ?? STATUT_LABELS[value] ?? `Statut ${value}`}
				</Tag>
			),
		},
		{
			title: "Date validation",
			dataIndex: "v_ValidationDate",
			key: "v_ValidationDate",
			render: (value: string) => (value ? new Date(value).toLocaleDateString("fr-FR") : "-"),
		},
		{
			title: "Acheteur",
			dataIndex: "bA_Acheteur",
			key: "bA_Acheteur",
			render: (value: boolean) => (value ? <Tag color="purple">Acheteur</Tag> : null),
		},
	];

	const typeIsKnown = typesBesoin.length > 0;

	const tabs = [
		{
			key: "general",
			label: "General",
			children: (
				<>
					<Form.Item name="b_IdDemandeur" hidden>
						<Input />
					</Form.Item>

					<Form.Item name="b_Numero" label="Numero" rules={[{ required: true, message: "Numero obligatoire" }]}>
						<Input disabled={b_No !== 0} />
					</Form.Item>

					{typeIsKnown ? (
						<Form.Item name="bT_Id" label="Type de besoin" rules={[{ required: true, message: "Type obligatoire" }]}>
							<Select placeholder="Selectionner un type" onChange={onBesoinTypeChange} disabled={b_No !== 0}>
								{typesBesoin.map((type) => {
									const row = type as unknown as {
										bT_Id?: number;
										BT_Id?: number;
										bT_Intitule?: string;
										BT_Intitule?: string;
									};
									const typeId = asNumber(row.bT_Id ?? row.BT_Id);
									const label = asString(row.bT_Intitule ?? row.BT_Intitule);
									return (
										<Option key={typeId} value={typeId}>
											{label || `Type ${typeId}`}
										</Option>
									);
								})}
							</Select>
						</Form.Item>
					) : (
						<Form.Item
							name="bT_Id"
							label="Type de besoin (ID)"
							rules={[{ required: true, message: "Type obligatoire" }]}
						>
							<InputNumber
								style={{ width: "100%" }}
								min={1}
								onChange={(value) => void onBesoinTypeChange(asNumber(value))}
							/>
						</Form.Item>
					)}

					<Form.Item name="b_Titre" label="Titre" rules={[{ required: true, message: "Titre obligatoire" }]}>
						<Input />
					</Form.Item>
					<Form.Item
						name="b_Description"
						label="Description"
						rules={[{ required: true, message: "Description obligatoire" }]}
					>
						<TextArea rows={3} />
					</Form.Item>

					<Form.Item name="cA_Num" label="Affaire">
						<Select placeholder="Selectionner une affaire" allowClear>
							{affaires.map((affaire) => {
								const code = asString(
									(affaire as Record<string, unknown>).cA_Num ?? (affaire as Record<string, unknown>).CA_Num,
								);
								const label = asString(
									(affaire as Record<string, unknown>).cA_Intitule ?? (affaire as Record<string, unknown>).CA_Intitule,
								);
								return (
									<Option key={code} value={code}>
										{code} | {label}
									</Option>
								);
							})}
						</Select>
					</Form.Item>

					<Form.Item name="dE_No" label="Depot">
						<Select placeholder="Selectionner un depot" allowClear>
							{depots.map((depot) => {
								const depotNo = asNumber(
									(depot as Record<string, unknown>).dE_No ?? (depot as Record<string, unknown>).DE_No,
								);
								const label = asString(
									(depot as Record<string, unknown>).dE_Intitule ?? (depot as Record<string, unknown>).DE_Intitule,
								);
								return (
									<Option key={depotNo} value={depotNo}>
										{label}
									</Option>
								);
							})}
						</Select>
					</Form.Item>

					<Form.Item label="Pieces jointes">
						<Upload
							multiple
							beforeUpload={(file) => {
								setFiles((prev) => [...prev, file]);
								return false;
							}}
							fileList={files.map((file, index) => ({
								uid: String(index),
								name: file.name,
								status: "done",
							}))}
							onRemove={(file) => {
								setFiles((prev) => prev.filter((_, index) => String(index) !== file.uid));
							}}
						>
							<Button icon={<UploadOutlined />}>Ajouter des fichiers</Button>
						</Upload>
					</Form.Item>
				</>
			),
		},
		{
			key: "articles",
			label: `Articles (${articles.length})`,
			children: (
				<>
					<Form form={articleForm} layout="inline" style={{ marginBottom: 12 }}>
						<Form.Item name="bA_RefArticle" rules={[{ required: true, message: "Reference requise" }]}>
							<Input placeholder="Reference article" style={{ width: 160 }} />
						</Form.Item>
						<Form.Item name="bA_DesigArticle" rules={[{ required: true, message: "Designation requise" }]}>
							<Input placeholder="Designation" style={{ width: 220 }} />
						</Form.Item>
						<Form.Item name="bA_Quantite" rules={[{ required: true, message: "Quantite requise" }]}>
							<InputNumber placeholder="Quantite" min={0.01} style={{ width: 120 }} />
						</Form.Item>
						<Form.Item name="bA_Unite">
							<Input placeholder="Unite" style={{ width: 110 }} />
						</Form.Item>
						<Form.Item>
							<Space>
								<Button type="primary" icon={<PlusOutlined />} onClick={() => void handleSaveArticle()}>
									{editingArticle ? "Mettre a jour" : "Ajouter"}
								</Button>
								{editingArticle && (
									<Button
										onClick={() => {
											setEditingArticle(null);
											articleForm.resetFields();
										}}
									>
										Annuler
									</Button>
								)}
							</Space>
						</Form.Item>
					</Form>

					<Table<IBesoinArticle>
						dataSource={articles}
						columns={articleColumns}
						rowKey={(row) => String(asNumber(row.bA_No ?? row.BA_No))}
						size="small"
						pagination={false}
						scroll={{ x: "max-content" }}
					/>
				</>
			),
		},
		{
			key: "validation",
			label: "Circuit de validation",
			children: (
				<Table<IValidateurBesoin>
					dataSource={validateurs}
					columns={validationColumns}
					rowKey={(row) =>
						String(asNumber(row.v_Id ?? row.V_Id) || `${row.uS_Id || row.US_Id}-${row.v_Niveau || row.V_Niveau || 0}`)
					}
					size="small"
					pagination={false}
					scroll={{ x: "max-content" }}
				/>
			),
		},
	];

	return (
		<Form form={form} layout="vertical" onFinish={handleSaveBesoin}>
			<Space style={{ marginBottom: 12 }}>
				<Button onClick={onBack}>Retour</Button>
				{b_No > 0 && besoin && (
					<Button
						icon={<CheckCircleOutlined />}
						onClick={() => void handleConfirmer()}
						style={{ color: "green", borderColor: "green" }}
					>
						Confirmer la demande
					</Button>
				)}
			</Space>

			<Tabs items={tabs} />

			<Form.Item style={{ marginTop: 16 }}>
				<Button type="primary" htmlType="submit" loading={loading}>
					Enregistrer
				</Button>
			</Form.Item>
		</Form>
	);
}
