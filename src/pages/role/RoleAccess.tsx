import { PlusOutlined, SaveOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Collapse, message, Row, Space, Spin } from "antd";
import { useEffect, useState } from "react";
import { useRoleStore } from "../../store/useRoleStore";
import RoleListModal from "./RoleListModal";

export default function RoleAccess({ allExpanded }: { allExpanded?: boolean }) {
	const {
		actifRoles,
		selectedRole,
		setSelectedRole,
		droitAccess,
		fetchRoleAccess,
		loading,
		isAdminRole,
		addOrUpdateDroitAcces,
	} = useRoleStore();
	const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
	const [localAccess, setLocalAccess] = useState<any[]>([]);
	const [activeKeys, setActiveKeys] = useState<string[]>([]);

	useEffect(() => {
		if (selectedRole) {
			fetchRoleAccess(selectedRole.rO_No);
		}
	}, [selectedRole, fetchRoleAccess]);

	useEffect(() => {
		if (selectedRole && isAdminRole(selectedRole)) {
			// For admin role, force all rights to be enabled and disable modification
			const adminAccess = droitAccess.map((group: any) => ({
				...group,
				droits: group.droits?.map((droit: any) => ({
					...droit,
					dA_Autoriser: true,
				})),
			}));
			setLocalAccess(adminAccess);
		} else {
			setLocalAccess(droitAccess || []);
		}
	}, [droitAccess, selectedRole, isAdminRole]);

	// Sync activeKeys with allExpanded prop
	useEffect(() => {
		if (allExpanded) {
			setActiveKeys(localAccess.map((g: any) => g.dA_IdGroup).filter(Boolean));
		} else {
			setActiveKeys([]);
		}
	}, [allExpanded, localAccess]);

	const handleSaveAccess = async () => {
		if (!selectedRole) return;

		// Prevent saving access rights for admin role
		if (isAdminRole(selectedRole)) {
			message.warning("Les droits d'accès du rôle administrateur ne peuvent pas être modifiés");
			return;
		}

		try {
			// Prepare access data for saving - map to C# model field names
			const accessData = localAccess.flatMap((group: any) =>
				(group.droits || []).map((droit: any) => ({
					DA_No: droit.dA_No,
					DA_Autoriser: droit.dA_Autoriser === true || droit.dA_Autoriser === "true",
					DA_Type_Acces: droit.dA_Type_Acces,
					DA_ValType_Acces: droit.dA_ValType_Acces,
					DA_Type_Autorisation: droit.dA_Type_Autorisation,
					DA_ValType_Autorisation: droit.dA_ValType_Autorisation,
					DA_Type_Autorisation_Niv2: droit.dA_Type_Autorisation_Niv2,
					DA_AccessGroup: parseInt(group.dA_IdGroup?.replace("DAG", "") || "0"),
					RO_No: selectedRole.rO_No,
				})),
			);

			// Send each access right individually since API expects single object
			let successCount = 0;
			const totalCount = accessData.length;

			for (const access of accessData) {
				try {
					console.log("Sending access data:", JSON.stringify(access, null, 2));
					const success = await addOrUpdateDroitAcces(access);
					if (success) {
						successCount++;
					}
				} catch (error) {
					console.error("Error saving access right:", access, error);
				}
			}

			if (successCount === totalCount) {
				message.success("Droits enregistrés avec succès");
			} else if (successCount > 0) {
				message.warning(`${successCount} sur ${totalCount} droits enregistrés`);
			} else {
				message.error("Erreur lors de l'enregistrement");
			}
		} catch (e) {
			message.error("Erreur lors de l'enregistrement");
		}
	};

	const handleCheckboxChange = (groupId: string, droitId: string, checked: boolean) => {
		// Prevent changing access rights for admin role
		if (selectedRole && isAdminRole(selectedRole)) {
			message.warning("Les droits d'accès du rôle administrateur ne peuvent pas être modifiés");
			return;
		}

		setLocalAccess((prev) =>
			prev.map((group) => {
				if (group.dA_IdGroup === groupId) {
					return {
						...group,
						droits: group.droits?.map((d: any) => (d.dA_No === droitId ? { ...d, dA_Autoriser: checked } : d)),
					};
				}
				return group;
			}),
		);
	};

	const handleGroupSelectAll = (groupId: string, checked: boolean) => {
		// Prevent changing access rights for admin role
		if (selectedRole && isAdminRole(selectedRole)) {
			message.warning("Les droits d'accès du rôle administrateur ne peuvent pas être modifiés");
			return;
		}

		setLocalAccess((prev) =>
			prev.map((group) => {
				if (group.dA_IdGroup === groupId) {
					return {
						...group,
						droits: group.droits?.map((d: any) => ({ ...d, dA_Autoriser: checked })),
					};
				}
				return group;
			}),
		);
	};

	const isGroupAllSelected = (group: any) => {
		if (!group.droits || group.droits.length === 0) return false;
		return group.droits.every((droit: any) => droit.dA_Autoriser === true || droit.dA_Autoriser === "true");
	};

	const handleNiv2GroupSelectAll = (groupId: string, checked: boolean) => {
		// Prevent changing access rights for admin role
		if (selectedRole && isAdminRole(selectedRole)) {
			message.warning("Les droits d'accès du rôle administrateur ne peuvent pas être modifiés");
			return;
		}

		// Find and update the niv2 group in all groups
		setLocalAccess((prev) =>
			prev.map((group) => ({
				...group,
				accessGroup_Niv2: group.accessGroup_Niv2?.map((niv2Group: any) => {
					if (niv2Group.dA_IdGroup === groupId) {
						return {
							...niv2Group,
							droits: niv2Group.droits?.map((d: any) => ({ ...d, dA_Autoriser: checked })),
						};
					}
					return niv2Group;
				}),
			})),
		);
	};

	return (
		<Row gutter={16}>
			<Col span={6}>
				<Button
					type="dashed"
					danger
					block
					icon={<PlusOutlined />}
					onClick={() => setIsManageRolesOpen(true)}
					className="mb-4"
				>
					Manager les rôles
				</Button>
				<div className="flex flex-col gap-2 h-[600px] overflow-y-auto pr-2">
					{Array.isArray(actifRoles) &&
						actifRoles.map((role, index) => (
							<Button
								key={role.rO_No || `role-${index}`}
								type={selectedRole?.rO_No === role.rO_No ? "primary" : "default"}
								onClick={() => setSelectedRole(role)}
								className="text-left overflow-hidden text-ellipsis whitespace-nowrap block w-full"
							>
								{role.rO_Intitule || `Role ${index + 1}`}
							</Button>
						))}
				</div>
			</Col>
			<Col span={18}>
				{selectedRole ? (
					<Spin spinning={loading}>
						<div className="flex justify-between items-center mb-4 border-b pb-4">
							<h3 className="text-lg font-semibold m-0 text-blue-700">Droits pour {selectedRole.rO_Intitule}</h3>
							<Space>
								<Checkbox>Autoriser tous</Checkbox>
								<Button icon={<ShareAltOutlined />}>Hériter</Button>
								<Button
									type="primary"
									icon={<SaveOutlined />}
									onClick={handleSaveAccess}
									disabled={selectedRole && isAdminRole(selectedRole)}
								>
									Enregistrer
								</Button>
							</Space>
						</div>

						<div className="h-[600px] overflow-y-auto pr-2">
							<Collapse
								activeKey={activeKeys}
								onChange={setActiveKeys}
								className="access-collapse"
								items={localAccess.map((group: any) => ({
									key: group.dA_IdGroup || `group-${Math.random()}`,
									label: (
										<div className="flex justify-between items-center w-full pr-4">
											<span className="font-medium text-blue-800">{group.dA_Group || "Groupe"}</span>
											<Checkbox
												checked={isGroupAllSelected(group)}
												onChange={(e) => handleGroupSelectAll(group.dA_IdGroup, e.target.checked)}
												disabled={selectedRole && isAdminRole(selectedRole)}
												onClick={(e) => e.stopPropagation()}
											>
												Autoriser tous
											</Checkbox>
										</div>
									),
									children: (
										<div className="p-4">
											{/* Main access rights */}
											{group.droits && group.droits.length > 0 && (
												<div className="mb-4">
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
														{group.droits?.map((droit: any) => (
															<Checkbox
																key={droit.dA_No}
																checked={droit.dA_Autoriser === true || droit.dA_Autoriser === "true"}
																onChange={(e) => handleCheckboxChange(group.dA_IdGroup, droit.dA_No, e.target.checked)}
																disabled={selectedRole && isAdminRole(selectedRole)}
															>
																{droit.dA_ValType_Acces}
															</Checkbox>
														))}
													</div>
												</div>
											)}

											{/* Sub access rights */}
											{group.accessGroup_Niv2 && group.accessGroup_Niv2.length > 0 && (
												<div className="mt-4">
													<Collapse
														size="small"
														className="niveau2-collapse"
														items={group.accessGroup_Niv2.map((niv2Group: any) => ({
															key: niv2Group.dA_IdGroup || `niv2-${Math.random()}`,
															label: (
																<div className="flex justify-between items-center w-full pr-4">
																	<span className="text-sm font-medium text-gray-600">
																		{niv2Group.dA_Group || "Sous-groupe"}
																	</span>
																	<Checkbox
																		checked={niv2Group.droits?.every(
																			(d: any) => d.dA_Autoriser === true || d.dA_Autoriser === "true",
																		)}
																		onChange={(e) => handleNiv2GroupSelectAll(niv2Group.dA_IdGroup, e.target.checked)}
																		disabled={selectedRole && isAdminRole(selectedRole)}
																		onClick={(e) => e.stopPropagation()}
																	>
																		Tous
																	</Checkbox>
																</div>
															),
															children: (
																<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2">
																	{niv2Group.droits?.map((droit: any) => (
																		<Checkbox
																			key={droit.dA_No}
																			checked={droit.dA_Autoriser === true || droit.dA_Autoriser === "true"}
																			onChange={(e) =>
																				handleCheckboxChange(group.dA_IdGroup, droit.dA_No, e.target.checked)
																			}
																			disabled={selectedRole && isAdminRole(selectedRole)}
																		>
																			{droit.dA_ValType_Acces}
																		</Checkbox>
																	))}
																</div>
															),
														}))}
													/>
												</div>
											)}
										</div>
									),
								}))}
							/>
						</div>
					</Spin>
				) : (
					<div className="flex items-center justify-center h-[400px] text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
						Sélectionnez un rôle pour voir ses droits
					</div>
				)}
			</Col>

			<RoleListModal open={isManageRolesOpen} onClose={() => setIsManageRolesOpen(false)} />
		</Row>
	);
}
