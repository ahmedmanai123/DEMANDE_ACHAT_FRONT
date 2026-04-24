import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Grid,
	MenuItem,
	Stack,
	TextField,
} from "@mui/material";
import {
	DataGrid,
	type GridColDef,
	type GridPaginationModel,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { besoinTypeService } from "@/services/besoinTypeService";
import type { ChampsLibre } from "@/types/besoinType";
import { toast } from "sonner";

interface ChampsLibreManagerProps {
	bT_Id: number;
}

export default function ChampsLibreManager({ bT_Id }: ChampsLibreManagerProps) {
	const [champsLibres, setChampsLibres] = useState<ChampsLibre[]>([]);
	const [loading, setLoading] = useState(false);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		page: 0,
		pageSize: 10,
	});
	const [totalItems, setTotalItems] = useState(0);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedChamp, setSelectedChamp] = useState<ChampsLibre | null>(null);
	const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

	// Form state
	const [formData, setFormData] = useState({
		cBMarq: 0,
		cL_Nature: "",
		cL_ChampLibre_Document: "",
		cL_ChampDisplayName_Document: "",
		cL_TableChampLibre_Source: "",
		cL_ChampLibre_Source: "",
		cL_Actif: false,
		cL_Obligatoire: false,
	});

	// Dropdown options
	const natureOptions = [
		{ value: "0", text: "Besoin" },
		{ value: "1", text: "Article besoin" },
	];
	const [champOptions, setChampOptions] = useState<{ value: string; text: string }[]>([]);
	const [tableSourceOptions, setTableSourceOptions] = useState<{ value: string; text: string }[]>([]);
	const [champSourceOptions, setChampSourceOptions] = useState<{ value: string; text: string }[]>([]);

	const loadChampsLibres = useCallback(async () => {
		if (!bT_Id) return;
		try {
			setLoading(true);
			const result = await besoinTypeService.getChampsLibres({
				bT_Id,
				pageIndex: paginationModel.page + 1,
				pageSize: paginationModel.pageSize,
			});
			setChampsLibres(result.data || []);
			setTotalItems(result.itemsCount || 0);
		} catch {
			toast.error("Erreur chargement champs libres");
		} finally {
			setLoading(false);
		}
	}, [bT_Id, paginationModel]);

	useEffect(() => {
		loadChampsLibres();
	}, [loadChampsLibres]);

	const handleOpenDialog = (champ?: ChampsLibre) => {
		if (champ) {
			setSelectedChamp(champ);
			setFormData({
				cBMarq: champ.cbMarq,
				cL_Nature: champ.cL_Nature?.toString() || "",
				cL_ChampLibre_Document: champ.cL_ChampLibre_Document || "",
				cL_ChampDisplayName_Document: champ.cL_ChampLibre_Document || "",
				cL_TableChampLibre_Source: champ.cL_TableChampLibre_Source || "",
				cL_ChampLibre_Source: champ.cL_ChampLibre_Source || "",
				cL_Actif: champ.cL_ValActif === "Oui",
				cL_Obligatoire: champ.cL_ValObligatoire === "Oui",
			});
		} else {
			setSelectedChamp(null);
			resetForm();
		}
		setDialogOpen(true);
	};

	const resetForm = () => {
		setFormData({
			cBMarq: 0,
			cL_Nature: "",
			cL_ChampLibre_Document: "",
			cL_ChampDisplayName_Document: "",
			cL_TableChampLibre_Source: "",
			cL_ChampLibre_Source: "",
			cL_Actif: false,
			cL_Obligatoire: false,
		});
		setChampOptions([]);
		setTableSourceOptions([]);
		setChampSourceOptions([]);
	};

	const handleNatureChange = async (nature: string) => {
		setFormData((prev) => ({
			...prev,
			cL_Nature: nature,
			cL_ChampLibre_Document: "",
			cL_ChampDisplayName_Document: "",
			cL_TableChampLibre_Source: "",
			cL_ChampLibre_Source: "",
		}));

		if (nature) {
			try {
				const data = await besoinTypeService.getChampsLibreSage({
					nature: parseInt(nature),
				});
				setChampOptions(data || []);
			} catch {
				toast.error("Erreur chargement champs");
			}
		} else {
			setChampOptions([]);
		}
	};

	const handleChampChange = async (champ: string) => {
		setFormData((prev) => ({
			...prev,
			cL_ChampLibre_Document: champ,
			cL_ChampDisplayName_Document: champ,
		}));

		if (champ && formData.cL_Nature) {
			try {
				const rep = await besoinTypeService.getTypeChampLibre({
					nature: parseInt(formData.cL_Nature),
					champName: champ,
				});

				if (rep?.typeChamp === 6) {
					// Type Table
					const tables = await besoinTypeService.getTableChampLibreSource({
						nature: parseInt(formData.cL_Nature),
					});
					setTableSourceOptions(tables || []);
				} else {
					setTableSourceOptions([]);
					setFormData((prev) => ({
						...prev,
						cL_TableChampLibre_Source: "",
						cL_ChampLibre_Source: "",
					}));
				}
			} catch {
				toast.error("Erreur chargement table source");
			}
		}
	};

	const handleTableSourceChange = async (table: string) => {
		setFormData((prev) => ({
			...prev,
			cL_TableChampLibre_Source: table,
		}));

		if (table && formData.cL_Nature) {
			try {
				const data = await besoinTypeService.getChampsLibreSage({
					nature: parseInt(formData.cL_Nature),
					tableName: table,
					typeString: true,
				});
				setChampSourceOptions(data || []);
			} catch {
				toast.error("Erreur chargement champ source");
			}
		}
	};

	const handleSave = async () => {
		try {
			if (!formData.cL_Nature) {
				toast.error("Nature est obligatoire");
				return;
			}
			if (!formData.cL_ChampLibre_Document) {
				toast.error("Choix du champ est obligatoire");
				return;
			}
			if (!formData.cL_ChampDisplayName_Document) {
				toast.error("Champ intitulé est obligatoire");
				return;
			}

			await besoinTypeService.saveChampsLibre({
				...formData,
				cbMarq: formData.cBMarq || 0,
				bT_Id,
				cL_Nature: formData.cL_Nature ? parseInt(formData.cL_Nature, 10) : undefined,
				cL_Actif: formData.cL_Actif ? 1 : 0,
				cL_Obligatoire: formData.cL_Obligatoire ? 1 : 0,
			});

			toast.success("Champ libre enregistré");
			setDialogOpen(false);
			loadChampsLibres();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur sauvegarde");
		}
	};

	const handleDelete = async () => {
		if (!selectedRowId) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}

		if (!confirm("Voulez-vous supprimer ce champ libre ?")) return;

		try {
			await besoinTypeService.deleteChampsLibre(selectedRowId);
			toast.success("Champ libre supprimé");
			setSelectedRowId(null);
			loadChampsLibres();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur suppression");
		}
	};

	const columns: GridColDef[] = [
		{ field: "CL_ValNature", headerName: "Nature", width: 120 },
		{ field: "cL_ChampLibre_Document", headerName: "Champ", width: 150 },
		{ field: "cL_ChampDisplayName_Document", headerName: "Champ intitulé", width: 150 },
		{ field: "CL_ValTableChampLibre_Source", headerName: "Table source", width: 150 },
		{ field: "cL_ChampLibre_Source", headerName: "Champ source", width: 150 },
		{ field: "CL_ValType", headerName: "Type", width: 100 },
		{ field: "CL_ValTaille", headerName: "Taille", width: 80 },
		{ field: "CL_ValActif", headerName: "Actif", width: 80 },
		{ field: "CL_ValObligatoire", headerName: "Obligatoire", width: 120 },
	];

	return (
		<Box sx={{ p: 2 }}>
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
						<Button
							variant="outlined"
							color="success"
							size="small"
							startIcon={<AddIcon />}
							onClick={() => handleOpenDialog()}
						>
							Nouveau
						</Button>
						<Button
							variant="outlined"
							color="error"
							size="small"
							startIcon={<DeleteIcon />}
							onClick={handleDelete}
							disabled={!selectedRowId}
						>
							Supprimer
						</Button>
					</Stack>

					<DataGrid
						rows={champsLibres}
						columns={columns}
						loading={loading}
						rowCount={totalItems}
						paginationMode="server"
						getRowId={(row) => row.cbMarq}
						paginationModel={paginationModel}
						onPaginationModelChange={setPaginationModel}
						onRowSelectionModelChange={(ids) => {
							const selectedIds = Array.isArray(ids) ? ids : [];
							setSelectedRowId(selectedIds.length > 0 ? (selectedIds[0] as number) : null);
						}}
						checkboxSelection
						disableRowSelectionOnClick
						density="compact"
						autoHeight
						sx={{ minHeight: 400 }}
					/>
				</CardContent>
			</Card>

			{/* Dialog for Add/Edit */}
			<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>
					{selectedChamp ? "Modifier champ libre" : "Nouveau champ libre"}
				</DialogTitle>
				<DialogContent>
					<Grid container spacing={3} sx={{ mt: 1 }}>
						{/* Nature */}
						<Grid size={{ xs: 12, md: 4 }}>
							<TextField
								select
								label="Nature"
								value={formData.cL_Nature}
								onChange={(e) => handleNatureChange(e.target.value)}
								size="small"
								fullWidth
								required
							>
								<MenuItem value="">Choisir</MenuItem>
								{natureOptions.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>
										{opt.text}
									</MenuItem>
								))}
							</TextField>
						</Grid>

						{/* Champ */}
						<Grid size={{ xs: 12, md: 4 }}>
							<TextField
								select
								label="Champ"
								value={formData.cL_ChampLibre_Document}
								onChange={(e) => handleChampChange(e.target.value)}
								size="small"
								fullWidth
								required
								disabled={!formData.cL_Nature}
							>
								<MenuItem value="">Choisir</MenuItem>
								{champOptions.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>
										{opt.text}
									</MenuItem>
								))}
							</TextField>
						</Grid>

						{/* Champ intitulé */}
						<Grid size={{ xs: 12, md: 4 }}>
							<TextField
								label="Champ intitulé"
								value={formData.cL_ChampDisplayName_Document}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										cL_ChampDisplayName_Document: e.target.value,
									}))
								}
								size="small"
								fullWidth
								required
								slotProps={{ htmlInput: { maxLength: 128 } }}
							/>
						</Grid>

						{/* Table source (conditional) */}
						{tableSourceOptions.length > 0 && (
							<>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										select
										label="Table source"
										value={formData.cL_TableChampLibre_Source}
										onChange={(e) => handleTableSourceChange(e.target.value)}
										size="small"
										fullWidth
									>
										<MenuItem value="">Choisir</MenuItem>
										{tableSourceOptions.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>

								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										select
										label="Champ source"
										value={formData.cL_ChampLibre_Source}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												cL_ChampLibre_Source: e.target.value,
											}))
										}
										size="small"
										fullWidth
										disabled={!formData.cL_TableChampLibre_Source}
									>
										<MenuItem value="">Choisir</MenuItem>
										{champSourceOptions.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
							</>
						)}

						{/* Checkboxes */}
						<Grid size={{ xs: 12 }}>
							<Stack direction="row" spacing={3}>
								<FormControlLabel
									control={
										<Checkbox
											checked={formData.cL_Actif}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													cL_Actif: e.target.checked,
													cL_Obligatoire: e.target.checked ? prev.cL_Obligatoire : false,
												}))
											}
										/>
									}
									label="Actif"
								/>
								<FormControlLabel
									control={
										<Checkbox
											checked={formData.cL_Obligatoire}
											onChange={(e) =>
												setFormData((prev) => ({
													...prev,
													cL_Obligatoire: e.target.checked,
												}))
											}
											disabled={!formData.cL_Actif}
										/>
									}
									label="Obligatoire"
								/>
							</Stack>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialogOpen(false)}>Annuler</Button>
					<Button variant="contained" onClick={handleSave}>
						Enregistrer
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
