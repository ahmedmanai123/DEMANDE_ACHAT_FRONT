import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Grid,
	IconButton,
	Paper,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { besoinTypeService } from "@/services/besoinTypeService";
import type {
	BesoinTypeAffaire,
	BesoinTypeCategorie,
	BesoinTypeCircuit,
	BesoinTypeDepot,
	BesoinTypeItem,
	BesoinTypeSidebarItem,
	BesoinTypeUser,
	Rappel,
} from "@/types/besoinType";

function CircuitRowActions({
	index,
	niveau,
	isAcheteur,
	circuit,
	onDelete,
	onRappel,
}: {
	index: number;
	niveau: number;
	isAcheteur: boolean;
	circuit: BesoinTypeCircuit;
	onDelete: (index: number, niveau: number) => void;
	onRappel?: (circuit: BesoinTypeCircuit) => void;
}) {
	return (
		<Stack direction="row" spacing={0.5}>
			<IconButton size="small" color="error" onClick={() => onDelete(index, niveau)}>
				<DeleteIcon fontSize="small" />
			</IconButton>
			{!isAcheteur && circuit.cbMarq > 0 && onRappel && (
				<IconButton size="small" color="success" onClick={() => onRappel(circuit)}>
					<NotificationsIcon fontSize="small" />
					{circuit.r_No ? (
						<Box
							sx={{
								position: "absolute",
								top: 2,
								right: 2,
								width: 8,
								height: 8,
								bgcolor: "red",
								borderRadius: "50%",
								border: "1px solid white",
							}}
						/>
					) : null}
				</IconButton>
			)}
		</Stack>
	);
}

export default function BesoinTypePage() {
	const [sidebarItems, setSidebarItems] = useState<BesoinTypeSidebarItem[]>([]);
	const [selectedBTId, setSelectedBTId] = useState<number>(0);
	const [circuits, setCircuits] = useState<BesoinTypeCircuit[]>([]);
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [userSearchOpen, setUserSearchOpen] = useState(false);
	const [userSearchType, setUserSearchType] = useState<"acheteur" | "approbateur">("acheteur");
	const [userSearchQuery, setUserSearchQuery] = useState("");
	const [availableUsers, setAvailableUsers] = useState<{ uS_Id: string; uS_UserIntitule: string; picture?: string }[]>(
		[],
	);
	const [rappelModalOpen, setRappelModalOpen] = useState(false);
	const [currentRappelCircuit, setCurrentRappelCircuit] = useState<BesoinTypeCircuit | null>(null);
	const [rappel, setRappel] = useState<Rappel>({ cbMarq: 0 });
	const [managerOpen, setManagerOpen] = useState(false);
	const [managerItems, setManagerItems] = useState<BesoinTypeItem[]>([]);
	const [managerPagination, setManagerPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [managerTotal, setManagerTotal] = useState(0);
	const [managerLoading, setManagerLoading] = useState(false);
	const [newBesoinType, setNewBesoinType] = useState<{ bT_Id?: number; bT_Code: string; bT_Intitule: string }>({
		bT_Code: "",
		bT_Intitule: "",
	});
	const [addingNew, setAddingNew] = useState(false);
	const [selectedManagerItem, setSelectedManagerItem] = useState<BesoinTypeItem | null>(null);
	const [besoinTypeDetails, setBesoinTypeDetails] = useState<BesoinTypeItem | null>(null);
	const [referenceData, setReferenceData] = useState<{
		usersSage: { text: string; value: string }[];
		souches: { text: string; value: number }[];
		journaux: { text: string; value: string }[];
		comptesDebit: { text: string; value: string }[];
		comptesCredit: { text: string; value: string }[];
		articles: { text: string; value: string }[];
	} | null>(null);

	// Data sections state
	const [depots, setDepots] = useState<BesoinTypeDepot[]>([]);
	const [affaires, setAffaires] = useState<BesoinTypeAffaire[]>([]);
	const [categories, setCategories] = useState<BesoinTypeCategorie[]>([]);
	const [users, setUsers] = useState<BesoinTypeUser[]>([]);
	const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null);
	const [selectedAffaireId, setSelectedAffaireId] = useState<number | null>(null);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedCategorieId, setSelectedCategorieId] = useState<number | null>(null);
	const [userSelectionOpen, setUserSelectionOpen] = useState(false);
	const [circuitSelectionIndex, setCircuitSelectionIndex] = useState<number | null>(null);
	const [userSearchFilter, setUserSearchFilter] = useState("");

	// Collapsible sections state
	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
		impression: false,
		depots: false,
		affaires: false,
		utilisateurs: false,
		categories: false,
		comptabilisation: false,
		champsLibre: false,
		autres: false,
	});

	const loadSidebar = useCallback(async () => {
		try {
			const items = await besoinTypeService.getBesoinTypesForSidebar();
			setSidebarItems(items);
			if (items.length > 0 && selectedBTId === 0) {
				setSelectedBTId(items[0].bT_Id);
			}
		} catch {
			toast.error("Erreur chargement sidebar");
		}
	}, [selectedBTId]);

	const loadCircuits = useCallback(async (btId: number) => {
		try {
			setLoading(true);
			const data = await besoinTypeService.getCircuits(btId);
			setCircuits(data);
		} catch {
			toast.error("Erreur chargement circuits");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadBesoinTypeDetails = useCallback(async (btId: number) => {
		try {
			const result = await besoinTypeService.getBesoinTypeById(btId);
			setBesoinTypeDetails(result.besoinType);
		} catch {
			toast.error("Erreur chargement détails type besoin");
		}
	}, []);

	const loadReferenceData = useCallback(async () => {
		try {
			const data = await besoinTypeService.getReferenceData();
			setReferenceData(data);
		} catch (error) {
			// Silent fail - reference data endpoint may not exist in backend
			console.warn("Reference data endpoint not available:", error);
		}
	}, []);

	const loadDepots = useCallback(async (btId: number) => {
		try {
			const result = await besoinTypeService.getDepots({ bT_Id: btId, pageIndex: 1, pageSize: 100 });
			setDepots(result.data || []);
		} catch {
			// Silent fail
		}
	}, []);

	const loadAffaires = useCallback(async (btId: number) => {
		try {
			const result = await besoinTypeService.getAffaires({ bT_Id: btId, pageIndex: 1, pageSize: 100 });
			setAffaires(result.data || []);
		} catch {
			// Silent fail
		}
	}, []);

	const loadCategories = useCallback(async (btId: number) => {
		try {
			const result = await besoinTypeService.getCategories({ bT_Id: btId, pageIndex: 1, pageSize: 100 });
			setCategories(result.data || []);
		} catch {
			// Silent fail
		}
	}, []);

	const loadUsers = useCallback(async (btId: number) => {
		try {
			const result = await besoinTypeService.getUsers({ bT_Id: btId, pageIndex: 1, pageSize: 100 });
			setUsers(result.data || []);
		} catch {
			// Silent fail
		}
	}, []);

	useEffect(() => {
		loadSidebar();
	}, [loadSidebar]);

	useEffect(() => {
		if (selectedBTId > 0) {
			loadCircuits(selectedBTId);
			loadBesoinTypeDetails(selectedBTId);
			loadDepots(selectedBTId);
			loadAffaires(selectedBTId);
			loadCategories(selectedBTId);
			loadUsers(selectedBTId);
		}
	}, [selectedBTId, loadCircuits, loadBesoinTypeDetails, loadDepots, loadAffaires, loadCategories, loadUsers]);

	// Reference data endpoint doesn't exist in backend - disabled
	// useEffect(() => {
	// 	loadReferenceData();
	// }, [loadReferenceData]);

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const acheteurs = useMemo(() => circuits.filter((c) => c.bC_Acheteur), [circuits]);
	const approbateurs = useMemo(() => circuits.filter((c) => !c.bC_Acheteur), [circuits]);

	const handleAddAcheteur = () => {
		const newItem: BesoinTypeCircuit = {
			cbMarq: 0,
			bT_Id: selectedBTId,
			bC_Niveau: circuits.length,
			bC_Acheteur: true,
			bC_ApprDA: false,
			bC_ApprRB: false,
			bC_ConsulteStock: false,
			bC_ValidBC: false,
			bC_ValidDP: false,
			picture: "/Pictures/default_user.jpg",
			uS_UserIntitule: "",
		};
		setCircuits((prev) => [...prev, newItem]);
	};

	const handleAddApprobateur = () => {
		const newItem: BesoinTypeCircuit = {
			cbMarq: 0,
			bT_Id: selectedBTId,
			bC_Niveau: circuits.length,
			bC_Acheteur: false,
			bC_ApprDA: false,
			bC_ApprRB: false,
			bC_ConsulteStock: false,
			bC_ValidBC: false,
			bC_ValidDP: false,
			picture: "/Pictures/default_user.jpg",
			uS_UserIntitule: "",
		};
		setCircuits((prev) => [...prev, newItem]);
	};

	const handleDeleteCircuit = (index: number, niveau: number) => {
		const isAcheteur = circuits[index]?.bC_Acheteur ?? false;
		if (isAcheteur) {
			const countAcheteur = circuits.filter((c) => c.bC_Acheteur).length;
			if (countAcheteur <= 1) {
				toast.error("Il faut au moins un acheteur dans le circuit !");
				return;
			}
		}
		const newCircuits = [...circuits];
		newCircuits.splice(index, 1);
		for (let i = index; i < newCircuits.length; i++) {
			if (!newCircuits[i].bC_Acheteur && newCircuits[i].bC_Niveau > 0) {
				newCircuits[i] = { ...newCircuits[i], bC_Niveau: newCircuits[i].bC_Niveau - 1 };
			}
		}
		setCircuits(newCircuits);
	};

	const handleCircuitChange = (index: number, field: keyof BesoinTypeCircuit, value: unknown) => {
		const updated = [...circuits];
		updated[index] = { ...updated[index], [field]: value };
		setCircuits(updated);
	};

	const handleOpenUserSelection = (index: number) => {
		setCircuitSelectionIndex(index);
		setUserSearchFilter("");
		setUserSelectionOpen(true);
	};

	const handleSelectUser = (selectedUser: BesoinTypeUser) => {
		if (circuitSelectionIndex === null) return;

		const updated = [...circuits];
		updated[circuitSelectionIndex] = {
			...updated[circuitSelectionIndex],
			uS_Id: selectedUser.uS_Id,
			uS_UserIntitule: selectedUser.uS_UserIntitule,
		};
		setCircuits(updated);
		setUserSelectionOpen(false);
		setCircuitSelectionIndex(null);
		toast.success(`Utilisateur "${selectedUser.uS_UserIntitule}" affecté`);
	};

	const handleSaveCircuits = async () => {
		try {
			setSaving(true);
			await besoinTypeService.saveCircuits({ bT_Id: selectedBTId, data: circuits });
			toast.success("Utilisateur(s) affecté(s)");
			await loadCircuits(selectedBTId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur sauvegarde");
		} finally {
			setSaving(false);
		}
	};

	const handleOpenRappel = async (circuit: BesoinTypeCircuit) => {
		setCurrentRappelCircuit(circuit);
		try {
			const data = await besoinTypeService.getRappel(selectedBTId, {
				bcId: circuit.cbMarq,
				globale: false,
			});
			setRappel(data);
		} catch {
			setRappel({ cbMarq: 0, bC_Id: circuit.cbMarq, bT_Id: undefined });
		}
		setRappelModalOpen(true);
	};

	const handleSaveRappel = async () => {
		try {
			await besoinTypeService.saveRappel(rappel);
			toast.success("Rappel enregistré");
			setRappelModalOpen(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur rappel");
		}
	};

	const handleOpenManager = async () => {
		setManagerOpen(true);
		await loadManagerItems();
		// Fetch last code for new besoin type
		try {
			const lastCode = await besoinTypeService.getLastCode();
			setNewBesoinType({ bT_Code: lastCode, bT_Intitule: "" });
		} catch {
			// Silent fail - user can still enter code manually
		}
	};

	const loadManagerItems = async () => {
		try {
			setManagerLoading(true);
			const result = await besoinTypeService.getBesoinTypes({
				pageIndex: managerPagination.page + 1,
				pageSize: managerPagination.pageSize,
			});
			setManagerItems(result.data);
			setManagerTotal(result.itemsCount);
		} catch {
			toast.error("Erreur chargement types besoin");
		} finally {
			setManagerLoading(false);
		}
	};

	const handleDeleteBesoinType = async (id: number) => {
		if (!confirm("Voulez-vous supprimer ce type besoin ?")) return;
		try {
			await besoinTypeService.deleteBesoinType(id);
			toast.success("Supprimé");
			await loadManagerItems();
			await loadSidebar();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur suppression");
		}
	};

	const handleAddBesoinType = async () => {
		if (!newBesoinType.bT_Code.trim() || !newBesoinType.bT_Intitule.trim()) {
			toast.error("Veuillez remplir tous les champs");
			return;
		}
		try {
			setAddingNew(true);
			await besoinTypeService.createBesoinType({
				bT_Code: newBesoinType.bT_Code,
				bT_Intitule: newBesoinType.bT_Intitule,
			});
			toast.success("Type besoin créé avec succès");
			setNewBesoinType({ bT_Code: "", bT_Intitule: "" });
			setSelectedManagerItem(null);
			// Fetch next code
			try {
				const lastCode = await besoinTypeService.getLastCode();
				setNewBesoinType({ bT_Code: lastCode, bT_Intitule: "" });
			} catch {
				// Silent fail
			}
			await loadManagerItems();
			await loadSidebar();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur création");
		} finally {
			setAddingNew(false);
		}
	};

	const handleUpdateBesoinType = async () => {
		if (!newBesoinType.bT_Id || !newBesoinType.bT_Intitule.trim()) {
			toast.error("Veuillez sélectionner un élément à modifier");
			return;
		}
		try {
			setAddingNew(true);
			await besoinTypeService.saveBesoinType({
				bT_Id: newBesoinType.bT_Id,
				bT_Code: newBesoinType.bT_Code,
				bT_Intitule: newBesoinType.bT_Intitule,
			});
			toast.success("Type besoin modifié avec succès");
			setNewBesoinType({ bT_Code: "", bT_Intitule: "" });
			setSelectedManagerItem(null);
			await loadManagerItems();
			await loadSidebar();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur modification");
		} finally {
			setAddingNew(false);
		}
	};

	const handleSelectManagerItem = (item: BesoinTypeItem) => {
		setSelectedManagerItem(item);
		setNewBesoinType({
			bT_Id: item.bT_Id,
			bT_Code: item.bT_Code,
			bT_Intitule: item.bT_Intitule,
		});
	};

	const handleClearSelection = () => {
		setSelectedManagerItem(null);
		setNewBesoinType({ bT_Code: "", bT_Intitule: "" });
		// Fetch last code for new entry
		besoinTypeService
			.getLastCode()
			.then((lastCode) => {
				setNewBesoinType({ bT_Code: lastCode, bT_Intitule: "" });
			})
			.catch(() => {});
	};

	const managerColumns: GridColDef<BesoinTypeItem>[] = [
		{ field: "bT_Code", headerName: "Code", width: 120 },
		{ field: "bT_Intitule", headerName: "Intitulé", flex: 1 },
		{
			field: "actions",
			headerName: "Actions",
			width: 120,
			sortable: false,
			filterable: false,
			renderCell: (params) => (
				<Stack direction="row" spacing={0.5}>
					<IconButton
						size="small"
						color="error"
						onClick={(e) => {
							e.stopPropagation();
							handleDeleteBesoinType(params.row.bT_Id);
						}}
					>
						<DeleteIcon fontSize="small" />
					</IconButton>
				</Stack>
			),
		},
	];

	return (
		<Box sx={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
			<Box sx={{ p: 2, pb: 0 }}>
				<Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
					Types besoin
				</Typography>
			</Box>

			<Grid container spacing={2} sx={{ flex: 1, px: 2, pb: 2, minHeight: 0 }}>
				{/* Sidebar */}
				<Grid size={{ xs: 12, md: 3, lg: 2 }} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
					<Button variant="outlined" color="error" fullWidth onClick={handleOpenManager}>
						Manager les besoin type
					</Button>
					<Divider />
					<Paper variant="outlined" sx={{ flex: 1, overflow: "auto" }}>
						<Stack divider={<Divider />}>
							{sidebarItems.length === 0 && (
								<Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
									Aucun Type besoin
								</Typography>
							)}
							{sidebarItems.map((item) => (
								<Box
									key={item.bT_Id}
									onClick={() => setSelectedBTId(item.bT_Id)}
									sx={{
										p: 1.5,
										cursor: "pointer",
										bgcolor: selectedBTId === item.bT_Id ? "action.selected" : "transparent",
										"&:hover": { bgcolor: "action.hover" },
										borderLeft: selectedBTId === item.bT_Id ? 3 : 0,
										borderColor: "primary.main",
									}}
								>
									<Typography variant="body2" sx={{ fontWeight: selectedBTId === item.bT_Id ? 600 : 400 }}>
										{item.bT_Intitule}
									</Typography>
									{item.r_No > 0 && (
										<Box
											sx={{
												width: 8,
												height: 8,
												bgcolor: "red",
												borderRadius: "50%",
												display: "inline-block",
												ml: 1,
											}}
										/>
									)}
								</Box>
							))}
						</Stack>
					</Paper>
				</Grid>

				{/* Main Content */}
				<Grid size={{ xs: 12, md: 9, lg: 10 }} sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
					{sidebarItems.length === 0 ? (
						<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
							<Typography variant="h6" color="text.secondary">
								Aucun Type besoin
							</Typography>
						</Box>
					) : (
						<>
							<Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center" }}>
								<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
									<Tab label="Générale" />
									<Tab label="Paramètres" />
								</Tabs>
								<Box sx={{ flex: 1 }} />
								{activeTab === 0 && (
									<Button
										variant="contained"
										size="small"
										sx={{ mr: 1, mb: 0.5 }}
										onClick={handleSaveCircuits}
										disabled={saving}
									>
										Enregistrer
									</Button>
								)}
							</Box>

							{activeTab === 0 && (
								<Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
									{/* Acheteurs */}
									<Card variant="outlined" sx={{ mb: 2 }}>
										<CardContent>
											<Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
												<Typography variant="h6">Acheteur</Typography>
												<IconButton size="small" color="primary" onClick={handleAddAcheteur}>
													<AddIcon />
												</IconButton>
											</Stack>
											{acheteurs.length === 0 ? (
												<Typography variant="body2" color="text.secondary">
													Aucun acheteur
												</Typography>
											) : (
												acheteurs.map((user, idx) => {
													const globalIndex = circuits.findIndex((c) => c === user);
													return (
														<Paper key={`acheteur-${globalIndex}`} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
															<Grid container spacing={2} sx={{ alignItems: "center" }}>
																<Grid size={{ xs: 12, sm: 6, md: 4 }}>
																	<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
																		<Chip label="Acheteur" size="small" color="secondary" />
																		<Box sx={{ width: 32, height: 32, flexShrink: 0 }}>
																			{user.picture ? (
																				<Box
																					component="img"
																					src={user.picture}
																					alt=""
																					sx={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
																				/>
																			) : (
																				<Box
																					sx={{
																						width: 32,
																						height: 32,
																						borderRadius: "50%",
																						bgcolor: "grey.300",
																						display: "flex",
																						alignItems: "center",
																						justifyContent: "center",
																					}}
																				>
																					<Typography variant="caption">U</Typography>
																				</Box>
																			)}
																		</Box>
																		<TextField
																			size="small"
																			value={user.uS_UserIntitule || ""}
																			slotProps={{ input: { readOnly: true } }}
																			sx={{ flex: 1 }}
																		/>
																		<Tooltip title="Affecter un utilisateur autorisé">
																			<IconButton
																				size="small"
																				color="primary"
																				onClick={() => handleOpenUserSelection(globalIndex)}
																			>
																				<PersonAddIcon fontSize="small" />
																			</IconButton>
																		</Tooltip>
																	</Stack>
																</Grid>
																<Grid size={{ xs: 12, sm: 6, md: 6 }}>
																	<Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
																		Responsable des achats
																	</Typography>
																</Grid>
																<Grid size={{ xs: 12, md: 2 }} sx={{ textAlign: "right" }}>
																	<CircuitRowActions
																		index={globalIndex}
																		niveau={user.bC_Niveau}
																		isAcheteur
																		circuit={user}
																		onDelete={handleDeleteCircuit}
																	/>
																</Grid>
															</Grid>
														</Paper>
													);
												})
											)}
										</CardContent>
									</Card>

									{/* Approbateurs */}
									<Card variant="outlined">
										<CardContent>
											<Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
												<Typography variant="h6">Approbateurs</Typography>
												<IconButton size="small" color="primary" onClick={handleAddApprobateur}>
													<AddIcon />
												</IconButton>
											</Stack>
											{approbateurs.length === 0 ? (
												<Typography variant="body2" color="text.secondary">
													Aucun approbateur
												</Typography>
											) : (
												approbateurs.map((user, idx) => {
													const globalIndex = circuits.findIndex((c) => c === user);
													return (
														<Paper key={`approbateur-${globalIndex}`} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
															<Grid container spacing={2} sx={{ alignItems: "center" }}>
																<Grid size={{ xs: 12, sm: 6, md: 4 }}>
																	<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
																		<Chip label={`Niveau ${user.bC_Niveau}`} size="small" color="primary" />
																		<Box sx={{ width: 32, height: 32, flexShrink: 0 }}>
																			{user.picture ? (
																				<Box
																					component="img"
																					src={user.picture}
																					alt=""
																					sx={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
																				/>
																			) : (
																				<Box
																					sx={{
																						width: 32,
																						height: 32,
																						borderRadius: "50%",
																						bgcolor: "grey.300",
																						display: "flex",
																						alignItems: "center",
																						justifyContent: "center",
																					}}
																				>
																					<Typography variant="caption">U</Typography>
																				</Box>
																			)}
																		</Box>
																		<TextField
																			size="small"
																			value={user.uS_UserIntitule || ""}
																			slotProps={{ input: { readOnly: true } }}
																			sx={{ flex: 1 }}
																		/>
																		<Tooltip title="Affecter un utilisateur autorisé">
																			<IconButton
																				size="small"
																				color="primary"
																				onClick={() => handleOpenUserSelection(globalIndex)}
																			>
																				<PersonAddIcon fontSize="small" />
																			</IconButton>
																		</Tooltip>
																	</Stack>
																</Grid>
																<Grid size={{ xs: 12, sm: 6, md: 6 }}>
																	<Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
																		<FormControlLabel
																			control={
																				<Switch
																					size="small"
																					checked={user.bC_ApprDA || false}
																					onChange={(e) =>
																						handleCircuitChange(globalIndex, "bC_ApprDA", e.target.checked)
																					}
																				/>
																			}
																			label="Approuver DA"
																		/>
																		<FormControlLabel
																			control={
																				<Switch
																					size="small"
																					checked={user.bC_ApprRB || false}
																					onChange={(e) =>
																						handleCircuitChange(globalIndex, "bC_ApprRB", e.target.checked)
																					}
																				/>
																			}
																			label="Approuver RB"
																		/>
																		<FormControlLabel
																			control={
																				<Switch
																					size="small"
																					checked={user.bC_ConsulteStock || false}
																					onChange={(e) =>
																						handleCircuitChange(globalIndex, "bC_ConsulteStock", e.target.checked)
																					}
																				/>
																			}
																			label="Consulter tous les dépôts"
																		/>
																	</Stack>
																</Grid>
																<Grid size={{ xs: 12, md: 2 }} sx={{ textAlign: "right" }}>
																	<CircuitRowActions
																		index={globalIndex}
																		niveau={user.bC_Niveau}
																		isAcheteur={false}
																		circuit={user}
																		onDelete={handleDeleteCircuit}
																		onRappel={handleOpenRappel}
																	/>
																</Grid>
															</Grid>
														</Paper>
													);
												})
											)}
										</CardContent>
									</Card>
								</Box>
							)}

							{activeTab === 1 && besoinTypeDetails && (
								<Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
									<Card variant="outlined">
										<CardContent>
											<Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
												Paramètres du type besoin: {besoinTypeDetails.bT_Intitule}
											</Typography>

											<Grid container spacing={3}>
												{/* Code */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Code"
														value={besoinTypeDetails.bT_Code}
														onChange={(e) => setBesoinTypeDetails({ ...besoinTypeDetails, bT_Code: e.target.value })}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Intitulé */}
												<Grid size={{ xs: 12, md: 8 }}>
													<TextField
														label="Intitulé"
														value={besoinTypeDetails.bT_Intitule}
														onChange={(e) =>
															setBesoinTypeDetails({ ...besoinTypeDetails, bT_Intitule: e.target.value })
														}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Degré d'importance */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Degré d'importance"
														type="number"
														value={besoinTypeDetails.bT_DegreImportance ?? ""}
														onChange={(e) =>
															setBesoinTypeDetails({
																...besoinTypeDetails,
																bT_DegreImportance: e.target.value ? Number(e.target.value) : undefined,
															})
														}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Modification degré d'importance */}
												<Grid size={{ xs: 12, md: 4 }}>
													<FormControlLabel
														control={
															<Switch
																checked={besoinTypeDetails.bT_ModifDegreImportance ?? false}
																onChange={(e) =>
																	setBesoinTypeDetails({
																		...besoinTypeDetails,
																		bT_ModifDegreImportance: e.target.checked,
																	})
																}
															/>
														}
														label="Modification degré d'importance"
													/>
												</Grid>

												{/* Comptabilisation Section */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
														Comptabilisation
													</Typography>
													<Divider sx={{ mb: 2 }} />
												</Grid>

												{/* Utilisateur Sage */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Utilisateur Sage"
														value={besoinTypeDetails.bT_UserSage ?? ""}
														onChange={(e) =>
															setBesoinTypeDetails({ ...besoinTypeDetails, bT_UserSage: e.target.value })
														}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Souche */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Souche"
														type="number"
														value={besoinTypeDetails.bT_Souche ?? ""}
														onChange={(e) =>
															setBesoinTypeDetails({
																...besoinTypeDetails,
																bT_Souche: e.target.value ? Number(e.target.value) : undefined,
															})
														}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Journal */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Journal"
														value={besoinTypeDetails.bT_Journal ?? ""}
														onChange={(e) => setBesoinTypeDetails({ ...besoinTypeDetails, bT_Journal: e.target.value })}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Compte Debit */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Compte Debit"
														value={besoinTypeDetails.bT_CompteDebit ?? ""}
														onChange={(e) =>
															setBesoinTypeDetails({ ...besoinTypeDetails, bT_CompteDebit: e.target.value })
														}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Compte Credit */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Compte Credit"
														value={besoinTypeDetails.bT_CompteCredit ?? ""}
														onChange={(e) =>
															setBesoinTypeDetails({ ...besoinTypeDetails, bT_CompteCredit: e.target.value })
														}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Article Divers */}
												<Grid size={{ xs: 12, md: 4 }}>
													<TextField
														label="Article Divers (AR_Ref)"
														value={besoinTypeDetails.aR_Ref ?? ""}
														onChange={(e) => setBesoinTypeDetails({ ...besoinTypeDetails, aR_Ref: e.target.value })}
														size="small"
														fullWidth
													/>
												</Grid>

												{/* Template Paths */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
														Chemins des templates
													</Typography>
													<Divider sx={{ mb: 2 }} />
												</Grid>

												<Grid size={{ xs: 12, md: 6 }}>
													<TextField
														label="Chemin template BC"
														value={besoinTypeDetails.bT_PathBC ?? ""}
														size="small"
														fullWidth
														helperText="Fichier BC (lecture seule)"
													/>
												</Grid>

												<Grid size={{ xs: 12, md: 6 }}>
													<TextField
														label="Chemin template DA"
														value={besoinTypeDetails.bT_PathDA ?? ""}
														size="small"
														fullWidth
														helperText="Fichier DA (lecture seule)"
													/>
												</Grid>

												<Grid size={{ xs: 12, md: 6 }}>
													<TextField
														label="Chemin template DB"
														value={besoinTypeDetails.bT_PathDB ?? ""}
														size="small"
														fullWidth
														helperText="Fichier DB (lecture seule)"
													/>
												</Grid>

												<Grid size={{ xs: 12, md: 6 }}>
													<TextField
														label="Chemin template DP"
														value={besoinTypeDetails.bT_PathDP ?? ""}
														size="small"
														fullWidth
														helperText="Fichier DP (lecture seule)"
													/>
												</Grid>

												{/* Signature Image */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
														Signature
													</Typography>
													<Divider sx={{ mb: 2 }} />
												</Grid>

												<Grid size={{ xs: 12, md: 6 }}>
													<TextField
														label="Chemin image signature"
														value={besoinTypeDetails.bT_SignatureImg ?? ""}
														size="small"
														fullWidth
														helperText="Image signature (lecture seule)"
													/>
												</Grid>

												{besoinTypeDetails.bT_SignatureImg && (
													<Grid size={{ xs: 12, md: 6 }}>
														<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
															<Typography variant="body2">Aperçu:</Typography>
															<Box
																component="img"
																src={besoinTypeDetails.bT_SignatureImg}
																alt="Signature"
																sx={{
																	maxWidth: 200,
																	maxHeight: 100,
																	border: "1px solid",
																	borderColor: "divider",
																	borderRadius: 1,
																}}
															/>
														</Box>
													</Grid>
												)}

												{/* Dépôts Section */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
														Dépôts
													</Typography>
													<Divider sx={{ mb: 2 }} />
													<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
														<Button variant="outlined" color="success" size="small" startIcon={<AddIcon />}>
															Affecter
														</Button>
														<Button
															variant="outlined"
															color="error"
															size="small"
															startIcon={<DeleteIcon />}
															disabled={!selectedDepotId}
															onClick={async () => {
																if (!selectedDepotId) return;
																if (!confirm("Voulez-vous supprimer ce dépôt ?")) return;
																try {
																	await besoinTypeService.deleteDepot(selectedDepotId);
																	toast.success("Dépôt supprimé");
																	setSelectedDepotId(null);
																	loadDepots(selectedBTId);
																} catch (error) {
																	toast.error(error instanceof Error ? error.message : "Erreur suppression");
																}
															}}
														>
															Supprimer
														</Button>
													</Stack>
													<DataGrid
														rows={depots}
														columns={[
															{ field: "dE_Intitule", headerName: "Dépôt", flex: 1 },
															{ field: "dE_Ville", headerName: "Ville", width: 150 },
														]}
														getRowId={(row) => row.cBMarq}
														onRowSelectionModelChange={(ids) => {
															const selectedIds = Array.from(ids.ids);
															setSelectedDepotId(selectedIds.length > 0 ? (selectedIds[0] as number) : null);
														}}
														checkboxSelection
														disableRowSelectionOnClick
														density="compact"
														autoHeight
														sx={{ minHeight: 200 }}
													/>
												</Grid>

												{/* Affaires Section */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
														Affaires
													</Typography>
													<Divider sx={{ mb: 2 }} />
													<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
														<Button variant="outlined" color="success" size="small" startIcon={<AddIcon />}>
															Affecter
														</Button>
														<Button
															variant="outlined"
															color="error"
															size="small"
															startIcon={<DeleteIcon />}
															disabled={!selectedAffaireId}
															onClick={async () => {
																if (!selectedAffaireId) return;
																if (!confirm("Voulez-vous supprimer cette affaire ?")) return;
																try {
																	await besoinTypeService.deleteAffaire(selectedAffaireId);
																	toast.success("Affaire supprimée");
																	setSelectedAffaireId(null);
																	loadAffaires(selectedBTId);
																} catch (error) {
																	toast.error(error instanceof Error ? error.message : "Erreur suppression");
																}
															}}
														>
															Supprimer
														</Button>
													</Stack>
													<DataGrid
														rows={affaires}
														columns={[
															{ field: "cA_Num", headerName: "N° Affaire", width: 150 },
															{ field: "cA_Intitule", headerName: "Intitulé", flex: 1 },
														]}
														getRowId={(row) => row.cBMarq}
														onRowSelectionModelChange={(ids) => {
															const selectedIds = Array.from(ids.ids);
															setSelectedAffaireId(selectedIds.length > 0 ? (selectedIds[0] as number) : null);
														}}
														checkboxSelection
														disableRowSelectionOnClick
														density="compact"
														autoHeight
														sx={{ minHeight: 200 }}
													/>
												</Grid>

												{/* Utilisateurs autorisés Section */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
														Utilisateurs autorisés
													</Typography>
													<Divider sx={{ mb: 2 }} />
													<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
														<Button variant="outlined" color="success" size="small" startIcon={<AddIcon />}>
															Affecter
														</Button>
														<Button
															variant="outlined"
															color="error"
															size="small"
															startIcon={<DeleteIcon />}
															disabled={!selectedUserId}
															onClick={async () => {
																if (!selectedUserId) return;
																if (!confirm("Voulez-vous supprimer cet utilisateur ?")) return;
																try {
																	await besoinTypeService.deleteUser(selectedUserId);
																	toast.success("Utilisateur supprimé");
																	setSelectedUserId(null);
																	loadUsers(selectedBTId);
																} catch (error) {
																	toast.error(error instanceof Error ? error.message : "Erreur suppression");
																}
															}}
														>
															Supprimer
														</Button>
													</Stack>
													<DataGrid
														rows={users}
														columns={[
															{ field: "uS_UserIntitule", headerName: "Nom d'affichage", flex: 1 },
															{ field: "uS_Id", headerName: "Nom d'utilisateur", width: 150 },
														]}
														getRowId={(row) => row.cBMarq}
														onRowSelectionModelChange={(ids) => {
															const selectedIds = Array.from(ids.ids);
															setSelectedUserId(selectedIds.length > 0 ? (selectedIds[0] as number) : null);
														}}
														checkboxSelection
														disableRowSelectionOnClick
														density="compact"
														autoHeight
														sx={{ minHeight: 200 }}
													/>
												</Grid>

												{/* Catégories Section */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
														Catégories
													</Typography>
													<Divider sx={{ mb: 2 }} />
													<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
														<Button variant="outlined" color="success" size="small" startIcon={<AddIcon />}>
															Affecter
														</Button>
														<Button
															variant="outlined"
															color="error"
															size="small"
															startIcon={<DeleteIcon />}
															disabled={!selectedCategorieId}
															onClick={async () => {
																if (!selectedCategorieId) return;
																if (!confirm("Voulez-vous supprimer cette catégorie ?")) return;
																try {
																	await besoinTypeService.deleteCategorie(selectedCategorieId);
																	toast.success("Catégorie supprimée");
																	setSelectedCategorieId(null);
																	loadCategories(selectedBTId);
																} catch (error) {
																	toast.error(error instanceof Error ? error.message : "Erreur suppression");
																}
															}}
														>
															Supprimer
														</Button>
													</Stack>
													<DataGrid
														rows={categories}
														columns={[
															{ field: "cL_Intitule1", headerName: "Catégorie 1", width: 200 },
															{ field: "cL_Intitule2", headerName: "Catégorie 2", width: 200 },
															{ field: "cL_Intitule3", headerName: "Catégorie 3", width: 200 },
															{ field: "cL_Intitule4", headerName: "Catégorie 4", width: 200 },
														]}
														getRowId={(row) => row.cBMarq}
														onRowSelectionModelChange={(ids) => {
															const selectedIds = Array.from(ids.ids);
															setSelectedCategorieId(selectedIds.length > 0 ? (selectedIds[0] as number) : null);
														}}
														checkboxSelection
														disableRowSelectionOnClick
														density="compact"
														autoHeight
														sx={{ minHeight: 200 }}
													/>
												</Grid>

												{/* Autres paramètres Section */}
												<Grid size={{ xs: 12 }}>
													<Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
														Autres paramètres
													</Typography>
													<Divider sx={{ mb: 2 }} />
													<Stack spacing={2}>
														<FormControlLabel
															control={<Switch checked={false} onChange={() => {}} size="small" />}
															label="Responsable hiérarchique inclus dans le circuit de validation"
														/>
														<FormControlLabel
															control={<Switch checked={false} onChange={() => {}} size="small" />}
															label="Retour obligatoire"
														/>
														<FormControlLabel
															control={<Switch checked={false} onChange={() => {}} size="small" />}
															label="Responsable inclus dans le circuit de retour"
														/>
														<FormControlLabel
															control={<Switch checked={false} onChange={() => {}} size="small" />}
															label="Tous validateurs inclus CR"
														/>
														<FormControlLabel
															control={<Switch checked={false} onChange={() => {}} size="small" />}
															label="Affaire obligatoire"
														/>
														<FormControlLabel
															control={<Switch checked={false} onChange={() => {}} size="small" />}
															label="Dépôt obligatoire"
														/>
													</Stack>
												</Grid>
											</Grid>

											<Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: "flex-end" }}>
												<Button
													variant="contained"
													color="primary"
													onClick={async () => {
														if (!besoinTypeDetails) return;
														try {
															await besoinTypeService.saveBesoinType(besoinTypeDetails);
															toast.success("Type besoin enregistré");
														} catch (error) {
															toast.error(error instanceof Error ? error.message : "Erreur sauvegarde");
														}
													}}
												>
													Enregistrer
												</Button>
											</Stack>
										</CardContent>
									</Card>
								</Box>
							)}

							{activeTab === 1 && !besoinTypeDetails && (
								<Box
									sx={{
										flex: 1,
										overflow: "auto",
										p: 2,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Typography variant="body1" color="text.secondary">
										Sélectionnez un type besoin pour voir ses paramètres
									</Typography>
								</Box>
							)}
						</>
					)}
				</Grid>
			</Grid>

			{/* Manager Modal */}
			<Dialog open={managerOpen} onClose={() => setManagerOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
						<Typography variant="h6">Manager les types besoin</Typography>
					</Stack>
				</DialogTitle>
				<DialogContent>
					<Stack spacing={3}>
						{/* Form Section */}
						<Card variant="outlined" sx={{ bgcolor: selectedManagerItem ? "action.selected" : "background.default" }}>
							<CardContent>
								<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
									{selectedManagerItem ? "Modifier le type de besoin" : "Nouveau type de besoin"}
								</Typography>
								<Grid container spacing={2} sx={{ alignItems: "flex-end" }}>
									<Grid size={{ xs: 12, sm: 4 }}>
										<TextField
											label="Code"
											value={newBesoinType.bT_Code}
											onChange={(e) => setNewBesoinType({ ...newBesoinType, bT_Code: e.target.value })}
											size="small"
											fullWidth
											disabled
										/>
									</Grid>
									<Grid size={{ xs: 12, sm: 8 }}>
										<TextField
											label="Intitulé"
											value={newBesoinType.bT_Intitule}
											onChange={(e) => setNewBesoinType({ ...newBesoinType, bT_Intitule: e.target.value })}
											size="small"
											fullWidth
											placeholder="Ex: Achat fournitures"
											onKeyPress={(e) => {
												if (e.key === "Enter") {
													if (selectedManagerItem) {
														handleUpdateBesoinType();
													} else {
														handleAddBesoinType();
													}
												}
											}}
										/>
									</Grid>
								</Grid>
							</CardContent>
						</Card>

						{/* Divider */}
						<Divider />

						{/* DataGrid Section */}
						<Box>
							<Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center", justifyContent: "flex-end" }}>
								<Button
									variant="contained"
									color="primary"
									onClick={() => {
										handleClearSelection();
									}}
									disabled={addingNew || !newBesoinType.bT_Intitule}
									startIcon={<AddIcon />}
								>
									{addingNew ? "..." : "Ajouter"}
								</Button>
								<Button
									variant="contained"
									color="warning"
									onClick={handleUpdateBesoinType}
									disabled={addingNew || !newBesoinType.bT_Intitule || selectedManagerItem === null}
									startIcon={<SaveIcon />}
								>
									{addingNew ? "..." : "Enregistrer"}
								</Button>
							</Stack>
							<DataGrid
								rows={managerItems}
								columns={managerColumns}
								loading={managerLoading}
								rowCount={managerTotal}
								paginationMode="server"
								getRowId={(row) => row.bT_Id}
								paginationModel={managerPagination}
								onPaginationModelChange={(model) => {
									setManagerPagination(model);
									loadManagerItems();
								}}
								onRowClick={(params) => handleSelectManagerItem(params.row)}
								density="compact"
								sx={{ minHeight: 300 }}
							/>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setManagerOpen(false)}>Fermer</Button>
				</DialogActions>
			</Dialog>

			{/* Rappel Modal */}
			<Dialog open={rappelModalOpen} onClose={() => setRappelModalOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					Parametrage rappel{" "}
					{currentRappelCircuit?.bC_Acheteur ? "Acheteur" : `Approbateur niveau ${currentRappelCircuit?.bC_Niveau}`}:{" "}
					{currentRappelCircuit?.uS_UserIntitule}
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Nombre de rappels"
							type="number"
							value={rappel.r_NbRappel || ""}
							onChange={(e) => setRappel({ ...rappel, r_NbRappel: Number(e.target.value) })}
							size="small"
							fullWidth
						/>
						<TextField
							label="Durée"
							type="number"
							value={rappel.r_Duree || ""}
							onChange={(e) => setRappel({ ...rappel, r_Duree: Number(e.target.value) })}
							size="small"
							fullWidth
						/>
						<FormControlLabel
							control={
								<Switch
									checked={rappel.r_ParamNotif || false}
									onChange={(e) => setRappel({ ...rappel, r_ParamNotif: e.target.checked })}
								/>
							}
							label="Notification"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={rappel.r_ParamMail || false}
									onChange={(e) => setRappel({ ...rappel, r_ParamMail: e.target.checked })}
								/>
							}
							label="Email"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={rappel.r_NotifDemandeur || false}
									onChange={(e) => setRappel({ ...rappel, r_NotifDemandeur: e.target.checked })}
								/>
							}
							label="Notifier demandeur"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					{rappel.cbMarq > 0 && (
						<Button
							color="error"
							onClick={() =>
								besoinTypeService
									.deleteRappel(rappel.cbMarq)
									.then(() => {
										toast.success("Rappel supprimé");
										setRappelModalOpen(false);
									})
									.catch((err) => toast.error(err.message))
							}
						>
							Désactiver
						</Button>
					)}
					<Button onClick={() => setRappelModalOpen(false)}>Annuler</Button>
					<Button variant="contained" onClick={handleSaveRappel}>
						Enregistrer
					</Button>
				</DialogActions>
			</Dialog>

			{/* User Selection Dialog */}
			<Dialog
				open={userSelectionOpen}
				onClose={() => {
					setUserSelectionOpen(false);
					setUserSearchFilter("");
				}}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>
					<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
						<PersonAddIcon color="primary" />
						<Typography variant="h6">Sélectionner un utilisateur autorisé</Typography>
					</Stack>
				</DialogTitle>
				<DialogContent>
					{users.length === 0 ? (
						<Box sx={{ py: 4, textAlign: "center" }}>
							<Typography variant="body1" color="text.secondary" gutterBottom>
								Aucun utilisateur autorisé disponible
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Veuillez d'abord affecter des utilisateurs dans l'onglet Paramètres → Utilisateurs autorisés
							</Typography>
						</Box>
					) : (
						<Stack spacing={2} sx={{ mt: 1 }}>
							{/* Search Bar */}
							<TextField
								fullWidth
								size="small"
								placeholder="Rechercher un utilisateur..."
								value={userSearchFilter}
								onChange={(e) => setUserSearchFilter(e.target.value)}
								slotProps={{
									input: {
										startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
									},
								}}
							/>

							{/* User List */}
							<Stack spacing={1} sx={{ maxHeight: 400, overflow: "auto" }}>
								{users
									.filter(
										(user) =>
											user.uS_UserIntitule?.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
											user.uS_Id?.toLowerCase().includes(userSearchFilter.toLowerCase()),
									)
									.map((user) => (
										<Paper
											key={user.cBMarq}
											variant="outlined"
											sx={{
												p: 1.5,
												cursor: "pointer",
												"&:hover": {
													bgcolor: "action.hover",
													borderColor: "primary.main",
												},
											}}
											onClick={() => handleSelectUser(user)}
										>
											<Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
												<Box
													sx={{
														width: 48,
														height: 48,
														borderRadius: "50%",
														bgcolor: "primary.main",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														boxShadow: 1,
													}}
												>
													<Typography variant="h6" color="white">
														{user.uS_UserIntitule?.charAt(0).toUpperCase()}
													</Typography>
												</Box>
												<Box sx={{ flex: 1 }}>
													<Typography variant="body1" sx={{ fontWeight: 600 }}>
														{user.uS_UserIntitule}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{user.uS_Id}
													</Typography>
												</Box>
												<IconButton size="small" color="primary">
													<AddIcon />
												</IconButton>
											</Stack>
										</Paper>
									))}
								{users.filter(
									(user) =>
										user.uS_UserIntitule?.toLowerCase().includes(userSearchFilter.toLowerCase()) ||
										user.uS_Id?.toLowerCase().includes(userSearchFilter.toLowerCase()),
								).length === 0 && (
									<Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
										Aucun utilisateur ne correspond à votre recherche
									</Typography>
								)}
							</Stack>
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setUserSelectionOpen(false);
							setUserSearchFilter("");
						}}
					>
						Annuler
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
