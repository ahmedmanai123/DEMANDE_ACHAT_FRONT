import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Col, Input, Modal, message, Row, Select, Space } from "antd";
import { useEffect, useState } from "react";
import { useRoleStore } from "../../store/useRoleStore";
import ProDataGrid from "../article/ProDataGrid";
import RoleFormModal from "./RoleFormModal";

const { Option } = Select;

const TYPE_COMPTE_OPTIONS = [
	{ value: 0, label: "Administrateur" },
	{ value: 1, label: "Acheteur" },
	{ value: 2, label: "Approbateur" },
	{ value: 3, label: "Demandeur" },
	{ value: 4, label: "Back-office" },
];

const ARCHIVE_OPTIONS = [
	{ value: "null", label: "Tous" },
	{ value: "true", label: "Oui" },
	{ value: "false", label: "Non" },
];

export default function RoleListModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	const { roles, fetchRoles, loading, deleteRole, createRole, updateRole, isAdminRole } = useRoleStore();
	const [selectedRole, setSelectedRole] = useState<any>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [filters, setFilters] = useState({
		search: "",
		typeRole: "null",
		archived: "null",
	});

	useEffect(() => {
		if (open) {
			fetchRoles();
		}
	}, [open, fetchRoles]);

	const columns = [
		{
			field: "RO_Code",
			headerName: "Code",
			width: 120,
			sortable: true,
		},
		{
			field: "RO_Intitule",
			headerName: "Intitulé",
			width: 200,
			sortable: true,
		},
		{
			field: "RO_ValTypeRole",
			headerName: "Type de rôle",
			width: 150,
			renderCell: ({ row }: any) => {
				const type = TYPE_COMPTE_OPTIONS.find((t) => t.value === row.RO_TypeRole);
				return type?.label || "-";
			},
		},
		{
			field: "RO_Archiver",
			headerName: "Archiver",
			width: 100,
			align: "center",
			renderCell: ({ value }: any) => (value ? "🗸" : ""),
		},
	];

	const filteredRoles = roles.filter((role) => {
		const matchesSearch =
			!filters.search ||
			role.rO_Code.toLowerCase().includes(filters.search.toLowerCase()) ||
			role.rO_Intitule.toLowerCase().includes(filters.search.toLowerCase());

		const matchesType = filters.typeRole === "null" || role.rO_TypeRole === parseInt(filters.typeRole);
		const matchesArchived =
			filters.archived === "null" || (filters.archived === "true" ? role.rO_Archiver : !role.rO_Archiver);

		return matchesSearch && matchesType && matchesArchived;
	});

	const handleDelete = async () => {
		if (!selectedRole) return;

		Modal.confirm({
			title: "Êtes-vous sûr de vouloir supprimer ce rôle?",
			content: `Rôle: ${selectedRole.RO_Intitule}`,
			okText: "Oui",
			cancelText: "Non",
			okType: "danger",
			onOk: async () => {
				const success = await deleteRole(selectedRole.RO_No);
				if (success) {
					message.success("Rôle supprimé avec succès");
					setSelectedRole(null);
					fetchRoles();
				}
			},
		});
	};

	const handleNew = () => {
		setSelectedRole(null);
		setIsFormOpen(true);
	};

	const handleEdit = () => {
		if (selectedRole) {
			setIsFormOpen(true);
		}
	};

	const handleFormSubmit = async (roleData: any) => {
		try {
			if (selectedRole) {
				// Update existing role
				const success = await updateRole({ ...roleData, RO_No: selectedRole.RO_No });
				if (success) {
					message.success("Rôle modifié avec succès");
					setIsFormOpen(false);
					setSelectedRole(null);
					fetchRoles();
				}
			} else {
				// Create new role
				const success = await createRole(roleData);
				if (success) {
					message.success("Rôle créé avec succès");
					setIsFormOpen(false);
					fetchRoles();
				}
			}
		} catch (error) {
			message.error("Erreur lors de l'opération");
		}
	};

	return (
		<Modal
			title="Manager les rôles"
			open={open}
			onCancel={onClose}
			width={1000}
			footer={null}
			className="role-list-modal"
		>
			{/* Filters */}
			<Row gutter={16} className="mb-4">
				<Col span={8}>
					<Input
						placeholder="Rechercher..."
						prefix={<SearchOutlined />}
						value={filters.search}
						onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
					/>
				</Col>
				<Col span={6}>
					<Select
						placeholder="Type de rôle"
						value={filters.typeRole}
						onChange={(value) => setFilters((prev) => ({ ...prev, typeRole: value }))}
						style={{ width: "100%" }}
					>
						{TYPE_COMPTE_OPTIONS.map((option) => (
							<Option key={option.value} value={option.value.toString()}>
								{option.label}
							</Option>
						))}
					</Select>
				</Col>
				<Col span={6}>
					<Select
						placeholder="Archiver"
						value={filters.archived}
						onChange={(value) => setFilters((prev) => ({ ...prev, archived: value }))}
						style={{ width: "100%" }}
					>
						{ARCHIVE_OPTIONS.map((option) => (
							<Option key={option.value} value={option.value}>
								{option.label}
							</Option>
						))}
					</Select>
				</Col>
				<Col span={4}>
					<Space>
						<Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
							Nouveau
						</Button>
						<Button
							danger
							icon={<DeleteOutlined />}
							onClick={handleDelete}
							disabled={!selectedRole || isAdminRole(selectedRole)}
						>
							Supprimer
						</Button>
						<Button icon={<EditOutlined />} onClick={handleEdit} disabled={!selectedRole || isAdminRole(selectedRole)}>
							Modifier
						</Button>
					</Space>
				</Col>
			</Row>

			<ProDataGrid
				rows={filteredRoles}
				columns={columns}
				loading={loading}
				rowCount={filteredRoles.length}
				paginationModel={{ page: 0, pageSize: 10 }}
				onPaginationModelChange={() => {}}
				getRowId={(row) => row.rO_No}
				selectedRowKey={selectedRole?.RO_No}
				onRowClick={({ row }) => setSelectedRole(row)}
			/>

			<RoleFormModal
				open={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				role={selectedRole}
				onSubmit={handleFormSubmit}
			/>
		</Modal>
	);
}
