import { DeleteOutlined, EditOutlined, EyeOutlined, InboxOutlined, StarFilled } from "@ant-design/icons";
import { Avatar, Button, Checkbox, message, Popconfirm, Space, Spin, Table, Tag, Tooltip } from "antd";
import type React from "react";
import { useState } from "react";
import { useEmailStore } from "../../store/useEmailStore";

const TemplateList: React.FC = () => {
	const {
		templates,
		templatesLoading,
		selectedTemplate,
		setSelectedTemplate,
		deleteTemplates,
		setDefaultTemplate,
		fetchTemplates,
	} = useEmailStore();

	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	// Helper functions
	const getTypeColor = (type: number) => {
		const colors: Record<number, string> = {
			1: "#1890ff", // ValidationDemandeBesoin
			2: "#52c41a", // DemandeAchat
			3: "#ff4d4f", // Refus_Demande_Article
			4: "#faad14", // ValidationRetourDemande
			5: "#722ed1", // ModifierQuantitArticle
			6: "#13c2c2", // BC_ValideBackOffice
		};
		return colors[type] || "#8c8c8c";
	};

	const getTypeLabel = (type: number) => {
		const labels: Record<number, string> = {
			1: "Validation demande de besoin",
			2: "Demande achat",
			3: "Refus demande article",
			4: "Retour demande",
			5: "Modifier quantité article",
			6: "BC validé back office",
		};
		return labels[type] || `Type ${type}`;
	};

	const stripHtml = (html: string | undefined | null) => {
		if (!html) return "";
		return html.replace(/<[^>]*>/g, "").substring(0, 80) + "...";
	};

	// Handler functions
	const handleRowSelection = (ids: React.Key[]) => {
		setSelectedIds(ids.map((id) => Number(id)));
	};

	const handleEdit = (template: any) => {
		setSelectedTemplate(template);
	};

	const handleSetDefault = async (id: number) => {
		try {
			await setDefaultTemplate(id);
			message.success("Modèle défini par défaut avec succès");
			fetchTemplates();
		} catch (error) {
			message.error("Erreur lors de la définition du modèle par défaut");
		}
	};

	const handleDelete = async (id: number) => {
		try {
			await deleteTemplates([id]);
			message.success("Modèle supprimé avec succès");
			setSelectedIds([]);
			fetchTemplates();
		} catch (error) {
			message.error("Erreur lors de la suppression du modèle");
		}
	};

	const deleteSelectedTemplates = async () => {
		try {
			await deleteTemplates(selectedIds);
			message.success("Modèles supprimés avec succès");
			setSelectedIds([]);
			fetchTemplates();
		} catch (error) {
			message.error("Erreur lors de la suppression des modèles");
		}
	};

	// Table columns
	const columns = [
		{
			title: "Intitulé",
			dataIndex: "mE_Intitule",
			key: "mE_Intitule",
			width: 250,
			render: (text: string, record: any) => (
				<div className="flex items-center gap-3">
					{record.mE_Default && (
						<Tag color="gold" icon={<StarFilled />}>
							Défaut
						</Tag>
					)}
					<div>
						<div className="font-medium text-gray-900">{text || "Sans titre"}</div>
						<div className="text-xs text-gray-500">ID: {record.mE_No}</div>
					</div>
				</div>
			),
		},
		{
			title: "Type",
			dataIndex: "mE_Type",
			key: "mE_Type",
			width: 200,
			render: (type: number) => <Tag color={getTypeColor(type)}>{getTypeLabel(type)}</Tag>,
		},
		{
			title: "Contenu",
			dataIndex: "mE_Contenu",
			key: "mE_Contenu",
			width: 300,
			render: (content: string) => (
				<div className="max-w-xs">
					<div className="text-sm text-gray-600 truncate">{stripHtml(content)}</div>
					<div className="text-xs text-gray-400 mt-1">{content ? `${content.length} caractères` : "Aucun contenu"}</div>
				</div>
			),
		},
		{
			title: "Créé le",
			dataIndex: "mE_DateCreation",
			key: "mE_DateCreation",
			width: 120,
			render: (date: string) => (
				<div className="text-sm">
					{date
						? new Date(date).toLocaleDateString("fr-FR", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
							})
						: "-"}
				</div>
			),
		},
		{
			title: "Créé par",
			dataIndex: "mE_CreateurName",
			key: "mE_CreateurName",
			width: 120,
			render: (name: string) => (
				<div className="flex items-center gap-2">
					<Avatar size="small" className="bg-blue-500">
						{name?.charAt(0)?.toUpperCase() || "U"}
					</Avatar>
					<span className="text-sm">{name || "Inconnu"}</span>
				</div>
			),
		},
		{
			title: "Actions",
			key: "actions",
			width: 150,
			render: (text: any, record: any) => (
				<Space size="small">
					<Tooltip title="Voir les détails">
						<Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleEdit(record)} />
					</Tooltip>
					<Tooltip title="Modifier">
						<Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
					</Tooltip>
					<Tooltip title="Définir par défaut">
						<Button
							type="text"
							size="small"
							icon={<StarFilled />}
							onClick={() => handleSetDefault(record.mE_No)}
							disabled={record.mE_Default}
							style={{ color: record.mE_Default ? "#faad14" : undefined }}
						/>
					</Tooltip>
					<Tooltip title="Supprimer">
						<Popconfirm
							title="Voulez-vous supprimer ce modèle ?"
							onConfirm={() => handleDelete(record.mE_No)}
							okText="Oui"
							cancelText="Non"
						>
							<Button type="text" size="small" icon={<DeleteOutlined />} danger />
						</Popconfirm>
					</Tooltip>
				</Space>
			),
		},
	];

	// Row selection
	const rowSelection = {
		selectedRowKeys: selectedIds,
		onChange: handleRowSelection,
	};

	// Loading state
	if (templatesLoading && (!templates || templates.length === 0)) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<Spin size="large" />
				<div className="mt-4 text-gray-500">Chargement des modèles...</div>
			</div>
		);
	}

	// Empty state
	if (!templatesLoading && (!templates || templates.length === 0)) {
		return (
			<div className="text-center py-12">
				<div className="text-gray-400 mb-4">
					<InboxOutlined style={{ fontSize: "48px" }} />
				</div>
				<h3 className="text-lg font-medium text-gray-900 mb-2">Aucun modèle trouvé</h3>
				<p className="text-gray-500 mb-4">Commencez par créer votre premier modèle d'email</p>
				<Button type="primary" onClick={() => fetchTemplates()}>
					Rafraîchir
				</Button>
			</div>
		);
	}

	return (
		<div className="template-list">
			{/* Header with actions */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Modèles d'Email</h2>
					<p className="text-gray-600">
						{templates.length} modèle{templates.length > 1 ? "s" : ""} trouvé{templates.length > 1 ? "s" : ""}
					</p>
				</div>
				{selectedIds.length > 0 && (
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-600">
							{selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
						</span>
						<Popconfirm
							title={`Voulez-vous supprimer les ${selectedIds.length} modèle${selectedIds.length > 1 ? "x" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""} ?`}
							onConfirm={() => deleteSelectedTemplates()}
							okText="Oui"
							cancelText="Non"
						>
							<Button danger icon={<DeleteOutlined />}>
								Supprimer
							</Button>
						</Popconfirm>
					</div>
				)}
			</div>

			{/* Templates table */}
			<Table
				rowSelection={rowSelection}
				columns={columns}
				dataSource={templates}
				rowKey="mE_No"
				loading={templatesLoading}
				pagination={{
					pageSize: 10,
					showSizeChanger: true,
					showQuickJumper: true,
					showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} modèle${total > 1 ? "x" : ""}`,
				}}
				className="shadow-sm"
				scroll={{ x: 1000 }}
				size="middle"
			/>
		</div>
	);
};

export default TemplateList;
