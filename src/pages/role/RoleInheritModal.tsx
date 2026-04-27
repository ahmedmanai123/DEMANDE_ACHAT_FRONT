import { ShareAltOutlined } from "@ant-design/icons";
import { Button, Col, Modal, message, Row } from "antd";
import { useEffect, useState } from "react";
import { useRoleStore } from "../../store/useRoleStore";
import ProDataGrid from "../article/ProDataGrid";

export default function RoleInheritModal({
	open,
	onClose,
	destinationRoleId,
}: {
	open: boolean;
	onClose: () => void;
	destinationRoleId?: number;
}) {
	const { roles, fetchRoles, loading, heriterRole } = useRoleStore();
	const [selectedRole, setSelectedRole] = useState<any>(null);

	useEffect(() => {
		if (open) {
			fetchRoles();
		}
	}, [open, fetchRoles]);

	const columns = [
		{ field: "rO_Code", headerName: "Code", width: 120 },
		{ field: "rO_Intitule", headerName: "Intitulé", width: 200 },
		{
			field: "rO_Archiver",
			headerName: "Archiver",
			width: 100,
			renderCell: ({ value }: any) => (value ? "🗸" : ""),
		},
	];

	const filteredRoles = roles.filter((role) => !role.rO_Archiver && role.rO_No !== destinationRoleId);

	const handleInherit = async () => {
		if (!selectedRole || !destinationRoleId) return;

		Modal.confirm({
			title: "Hériter les droits d'accès",
			content: `Voulez-vous hériter les droits du rôle "${selectedRole.rO_Intitule}" vers le rôle sélectionné?`,
			okText: "Oui",
			cancelText: "Non",
			onOk: async () => {
				try {
					const success = await heriterRole(selectedRole.rO_No, destinationRoleId);
					if (success) {
						message.success("Héritage effectué avec succès");
						onClose();
						setSelectedRole(null);
					}
				} catch (error) {
					message.error("Erreur lors de l'héritage");
				}
			},
		});
	};

	return (
		<Modal
			title="Hériter rôle"
			open={open}
			onCancel={onClose}
			width={800}
			footer={
				<div className="flex justify-end space-x-2">
					<Button onClick={onClose}>Annuler</Button>
					<Button type="primary" icon={<ShareAltOutlined />} onClick={handleInherit} disabled={!selectedRole}>
						Hériter
					</Button>
				</div>
			}
		>
			<div className="mb-4">
				<p className="text-gray-600">
					Sélectionnez un rôle source pour hériter ses droits d'accès vers le rôle de destination.
				</p>
			</div>

			<ProDataGrid
				rows={filteredRoles}
				columns={columns}
				loading={loading}
				rowCount={filteredRoles.length}
				paginationModel={{ page: 0, pageSize: 10 }}
				onPaginationModelChange={() => {}}
				getRowId={(row) => row.rO_No}
				selectedRowKey={selectedRole?.rO_No}
				onRowClick={({ row }) => setSelectedRole(row)}
			/>
		</Modal>
	);
}
