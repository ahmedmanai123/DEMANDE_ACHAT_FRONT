// src/pages/besoin/BesoinForm.tsx
import { useEffect, useState } from "react";
import { Form, Input, Tabs, Button, Select, Upload, Table, Space, Popconfirm, Tag, InputNumber, message } from "antd";
import { DeleteOutlined, PlusOutlined, CheckCircleOutlined, UploadOutlined } from "@ant-design/icons";
import * as besoinService from "@/services/besoinservice";
import type { IBesoin, IBesoinArticle, IBesoinType, IDepot, IAffaire, IValidateurBesoin } from "@/types/besoin";

const { Option } = Select;
const { TextArea } = Input;

interface Props {
	b_No: number;
	onBack: () => void;
}

const STATUT_COLORS: Record<number, string> = {
	0: "default",
	1: "blue",
	2: "green",
	3: "red",
	4: "orange",
	5: "purple",
};
const STATUT_LABELS: Record<number, string> = {
	0: "En attente",
	1: "Validé",
	2: "Rejeté",
	3: "Rectifier",
	4: "Attente acheteur",
	5: "Tous",
};

export default function BesoinForm({ b_No, onBack }: Props) {
	const [form] = Form.useForm();
	const [files, setFiles] = useState<File[]>([]);
	const [loading, setLoading] = useState(false);

	// Données de référence
	const [typesBesoin, setTypesBesoin] = useState<IBesoinType[]>([]);
	const [depots, setDepots] = useState<IDepot[]>([]);
	const [affaires, setAffaires] = useState<IAffaire[]>([]);

	// Articles liés
	const [articles, setArticles] = useState<IBesoinArticle[]>([]);

	// Circuit de validation
	const [validateurs, setValidateurs] = useState<IValidateurBesoin[]>([]);

	// Formulaire article inline
	const [articleForm] = Form.useForm();
	const [editingArticle, setEditingArticle] = useState<IBesoinArticle | null>(null);

	// Besoin courant
	const [besoin, setBesoin] = useState<IBesoin | null>(null);

	useEffect(() => {
		if (b_No === 0) {
			form.resetFields();
			setBesoin(null);
			setArticles([]);
			setValidateurs([]);
			loadNumero();
		} else {
			loadBesoin();
		}
	}, [b_No]);

	const loadNumero = async () => {
		const data = await besoinService.getLastNumero();
		form.setFieldValue("b_Numero", data?.numero);
	};

	const loadBesoin = async () => {
		const data = await besoinService.getBesoinById(b_No);
		const besoinData = data?.besoin ?? data;
		form.setFieldsValue(besoinData);
		setBesoin(besoinData);
		await loadArticles(b_No);

		// Circuit de validation
		if (besoinData?.bT_Id && besoinData?.b_IdDemandeur) {
			const circuit = await besoinService.getCircuitValidation(
				besoinData.bT_Id,
				b_No,
				besoinData.b_IdDemandeur,
				0, // Type_Validation.Demande_Besoin
			);
			setValidateurs(circuit ?? []);
		}
	};

	const loadArticles = async (id: number) => {
		const res = await besoinService.getBesoinArticles(id);
		setArticles(res ?? []);
	};

	const onBesoinTypeChange = async (bT_Id: number) => {
		const currentUser = form.getFieldValue("b_IdDemandeur") ?? "";
		const [dep, aff] = await Promise.all([
			besoinService.getDepotsAutoriser(bT_Id, currentUser),
			besoinService.getAffairesAutoriser(bT_Id),
		]);
		setDepots(dep ?? []);
		setAffaires(aff ?? []);
		// Circuit de validation
		const circuit = await besoinService.getCircuitValidation(bT_Id, b_No, currentUser, 0);
		setValidateurs(circuit ?? []);
	};

	const onFinish = async (values: Record<string, unknown>) => {
		setLoading(true);
		try {
			const fd = new FormData();
			Object.entries(values).forEach(([k, v]) => {
				if (v !== undefined && v !== null) fd.append(k, String(v));
			});
			files.forEach((f) => fd.append("files", f));
			await besoinService.saveBesoin(fd);
			message.success("Demande enregistrée");
			onBack();
		} catch (err: any) {
			message.error(err?.response?.data?.message ?? "Erreur lors de l'enregistrement");
		} finally {
			setLoading(false);
		}
	};

	const handleConfirmer = async () => {
		try {
			await besoinService.confirmerBesoin(b_No);
			message.success("Demande confirmée");
			onBack();
		} catch (err: any) {
			message.error(err?.response?.data?.message ?? "Erreur lors de la confirmation");
		}
	};

	const handleSaveArticle = async () => {
		const values = await articleForm.validateFields();
		try {
			await besoinService.saveArticleBesoin({
				...editingArticle,
				...values,
				b_BesoinId: b_No,
				bA_No: editingArticle?.bA_No ?? 0,
			});
			message.success("Article enregistré");
			articleForm.resetFields();
			setEditingArticle(null);
			await loadArticles(b_No);
		} catch (err: any) {
			message.error(err?.response?.data?.message ?? "Erreur");
		}
	};

	const handleDeleteArticle = async (bA_No: number) => {
		try {
			await besoinService.deleteArticleBesoin(bA_No);
			await loadArticles(b_No);
		} catch (err: any) {
			message.error(err?.response?.data?.message ?? "Erreur");
		}
	};

	const articleColumns = [
		{ title: "Référence", dataIndex: "bA_RefArticle", key: "bA_RefArticle", width: 130 },
		{ title: "Désignation", dataIndex: "bA_DesigArticle", key: "bA_DesigArticle" },
		{ title: "Quantité", dataIndex: "bA_Quantite", key: "bA_Quantite", width: 100 },
		{
			title: "Qté validée",
			dataIndex: "bA_QuantiteValider",
			key: "bA_QuantiteValider",
			width: 110,
		},
		{ title: "Unité", dataIndex: "bA_Unite", key: "bA_Unite", width: 90 },
		{
			title: "Actions",
			key: "actions",
			width: 100,
			render: (_: unknown, record: IBesoinArticle) => (
				<Space>
					<Button
						size="small"
						onClick={() => {
							setEditingArticle(record);
							articleForm.setFieldsValue(record);
						}}
					>
						Modifier
					</Button>
					<Popconfirm title="Supprimer cet article ?" onConfirm={() => handleDeleteArticle(record.bA_No)}>
						<Button size="small" danger icon={<DeleteOutlined />} />
					</Popconfirm>
				</Space>
			),
		},
	];

	const validationColumns = [
		{ title: "Niveau", dataIndex: "v_Niveau", key: "v_Niveau", width: 70 },
		{ title: "Validateur", dataIndex: "uS_UserIntitule", key: "uS_UserIntitule" },
		{ title: "Rôle", dataIndex: "rO_Intitule", key: "rO_Intitule" },
		{
			title: "Statut",
			dataIndex: "v_Status",
			key: "v_Status",
			render: (val: number, row: IValidateurBesoin) => (
				<Tag color={STATUT_COLORS[val] ?? "default"}>{row.v_ValStatus ?? STATUT_LABELS[val] ?? `Statut ${val}`}</Tag>
			),
		},
		{
			title: "Date validation",
			dataIndex: "v_ValidationDate",
			key: "v_ValidationDate",
			render: (val: string) => (val ? new Date(val).toLocaleDateString("fr-FR") : "-"),
		},
		{
			title: "Acheteur",
			dataIndex: "bA_Acheteur",
			key: "bA_Acheteur",
			render: (val: boolean) => (val ? <Tag color="purple">Acheteur</Tag> : null),
		},
	];

	const tabs = [
		{
			key: "general",
			label: "Général",
			children: (
				<>
					<Form.Item name="b_Numero" label="Numéro" rules={[{ required: true }]}>
						<Input disabled={b_No !== 0} />
					</Form.Item>
					<Form.Item name="bT_Id" label="Type de besoin" rules={[{ required: true }]}>
						<Select placeholder="Sélectionner un type" onChange={onBesoinTypeChange} disabled={b_No !== 0}>
							{typesBesoin.map((t) => (
								<Option key={t.bT_Id} value={t.bT_Id}>
									{t.bT_Intitule}
								</Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="b_Titre" label="Titre" rules={[{ required: true }]}>
						<Input />
					</Form.Item>
					<Form.Item name="b_Description" label="Description" rules={[{ required: true }]}>
						<TextArea rows={3} />
					</Form.Item>
					<Form.Item name="cA_Num" label="Affaire">
						<Select placeholder="Sélectionner une affaire" allowClear>
							{affaires.map((a) => (
								<Option key={a.cA_Num} value={a.cA_Num}>
									{a.cA_Num} | {a.cA_Intitule}
								</Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="dE_No" label="Dépôt">
						<Select placeholder="Sélectionner un dépôt" allowClear>
							{depots.map((d) => (
								<Option key={d.dE_No} value={d.dE_No}>
									{d.dE_Intitule}
								</Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item label="Pièces jointes">
						<Upload
							beforeUpload={(f) => {
								setFiles((prev) => [...prev, f]);
								return false;
							}}
							multiple
							fileList={files.map((f, i) => ({
								uid: String(i),
								name: f.name,
								status: "done",
							}))}
							onRemove={(file) => setFiles((prev) => prev.filter((_, i) => String(i) !== file.uid))}
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
					{/* Formulaire d'ajout/modification d'article */}
					<Form form={articleForm} layout="inline" style={{ marginBottom: 12 }}>
						<Form.Item name="bA_RefArticle" rules={[{ required: true, message: "Référence requise" }]}>
							<Input placeholder="Référence article" style={{ width: 140 }} />
						</Form.Item>
						<Form.Item name="bA_DesigArticle" rules={[{ required: true, message: "Désignation requise" }]}>
							<Input placeholder="Désignation" style={{ width: 200 }} />
						</Form.Item>
						<Form.Item name="bA_Quantite" rules={[{ required: true, message: "Quantité requise" }]}>
							<InputNumber placeholder="Quantité" min={0.01} style={{ width: 110 }} />
						</Form.Item>
						<Form.Item name="bA_Unite">
							<Input placeholder="Unité" style={{ width: 90 }} />
						</Form.Item>
						<Form.Item>
							<Space>
								<Button type="primary" icon={<PlusOutlined />} onClick={handleSaveArticle} disabled={b_No === 0}>
									{editingArticle ? "Mettre à jour" : "Ajouter"}
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
						rowKey="bA_No"
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
					rowKey={(r) => r.v_Id ?? Math.random()}
					size="small"
					pagination={false}
					scroll={{ x: "max-content" }}
				/>
			),
		},
	];

	return (
		<Form form={form} layout="vertical" onFinish={onFinish}>
			<Space style={{ marginBottom: 12 }}>
				<Button onClick={onBack}>← Retour</Button>
				{b_No !== 0 && besoin && (
					<Button
						icon={<CheckCircleOutlined />}
						onClick={handleConfirmer}
						style={{ color: "green", borderColor: "green" }}
					>
						Confirmer la demande
					</Button>
				)}
			</Space>

			<Tabs items={tabs} />

			<Form.Item>
				<Button type="primary" htmlType="submit" loading={loading}>
					Enregistrer
				</Button>
			</Form.Item>
		</Form>
	);
}
