import { CompressOutlined, ExpandOutlined, PlusOutlined, SaveOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, message, Space, Tabs, Typography } from "antd";
import { useEffect, useState } from "react";
import { useRoleStore } from "../../store/useRoleStore";
import RoleAccess from "./RoleAccess";
import RoleInheritModal from "./RoleInheritModal";
import RoleListModal from "./RoleListModal";
import RoleUsers from "./RoleUsers";

const { Title } = Typography;

export default function RolePage() {
	const [activeTab, setActiveTab] = useState("general");
	const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
	const [isInheritOpen, setIsInheritOpen] = useState(false);
	const [allExpanded, setAllExpanded] = useState(false);
	const [selectAllChecked, setSelectAllChecked] = useState(false);

	const { selectedRole, loading, error, actifRoles, checkAdminRole, heriterRole, fetchActifRoles } = useRoleStore();

	useEffect(() => {
		fetchActifRoles();
	}, [fetchActifRoles]);

	// Debug logging
	useEffect(() => {
		console.log("RolePage state:", { loading, error, actifRoles: actifRoles?.length, selectedRole });
	}, [loading, error, actifRoles, selectedRole]);

	const handleSaveAccess = async () => {
		if (!selectedRole) return;
		try {
			// This would save the access rights - implementation needed
			message.success("Droits enregistrés avec succès");
		} catch (error) {
			message.error("Erreur lors de l'enregistrement");
		}
	};

	const handleInheritRole = () => {
		if (selectedRole) {
			setIsInheritOpen(true);
		}
	};

	const handleToggleExpandAll = () => {
		setAllExpanded(!allExpanded);
		// Toggle all collapse elements
		const collapses = document.querySelectorAll(".ant-collapse");
		collapses.forEach((collapse) => {
			if (allExpanded) {
				// Collapse all
				const antCollapseHeader = collapse.querySelector(".ant-collapse-header");
				if (antCollapseHeader) (antCollapseHeader as HTMLElement).click();
			} else {
				// Expand all
				const antCollapseHeader = collapse.querySelector(".ant-collapse-header");
				if (antCollapseHeader && collapse.classList.contains("ant-collapse-item-active")) {
					(antCollapseHeader as HTMLElement).click();
				}
			}
		});
	};

	const handleSelectAllChange = (checked: boolean) => {
		setSelectAllChecked(checked);
		// Implementation for selecting all rights
	};

	const headerActions = null;

	return (
		<div className="p-4">
			{/* Error Display */}
			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-red-700 font-medium">Erreur: {error}</p>
				</div>
			)}

			{/* Loading Indicator */}
			{loading && (
				<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<p className="text-blue-700">Chargement des données...</p>
				</div>
			)}

			<Card title={<Title level={4}>Gestion des Rôles</Title>} className="w-full" extra={headerActions}>
				<Tabs
					activeKey={activeTab}
					onChange={setActiveTab}
					items={[
						{
							key: "general",
							label: "Générale",
							children: (
								<div>
									<div className="mb-4 flex justify-end">
										<Button
											icon={allExpanded ? <CompressOutlined /> : <ExpandOutlined />}
											onClick={handleToggleExpandAll}
										>
											{allExpanded ? "Fermer Tous" : "Développer Tous"}
										</Button>
									</div>
									<RoleAccess allExpanded={allExpanded} />
								</div>
							),
						},
						{
							key: "users",
							label: "Utilisateurs",
							children: <RoleUsers />,
						},
					]}
				/>
			</Card>

			<RoleListModal open={isManageRolesOpen} onClose={() => setIsManageRolesOpen(false)} />

			<RoleInheritModal
				open={isInheritOpen}
				onClose={() => setIsInheritOpen(false)}
				destinationRoleId={selectedRole?.rO_No}
			/>
		</div>
	);
}
