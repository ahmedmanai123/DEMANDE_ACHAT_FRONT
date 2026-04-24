import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import {
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Grid,
	IconButton,
	MenuItem,
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
import { parametresService } from "@/services/parametresService";
import type {
	AffaireAutorise,
	AffaireItem,
	CategorieAutorise,
	CategoriePayload,
	DepotAutorise,
	DepotItem,
	MotifRectification,
	MotifRectificationPayload,
	ParametreEntity,
	SelectOption,
	SelectOptionItem,
	SoucheItem,
} from "@/types/parametres";

const MOTIF_TYPE_OPTIONS = [
	{ value: 0, label: "Réinitialise le circuit" },
	{ value: 1, label: "Reprendre le circuit" },
	{ value: 2, label: "Dysfonctionnement" },
	{ value: 3, label: "Budget dépassé" },
];

const MOTIF_DEMANDE_OPTIONS = [
	{ value: 0, label: "Demande besoin" },
	{ value: 1, label: "Retour demande validation" },
];

const createDefaultMotif = (): MotifRectificationPayload => ({
	mR_No: 0,
	mR_Code: "",
	mR_Desgination: "",
	mR_TypeMotif: 0,
	mR_TypeDemande: 0,
});

const createDefaultParametre = (): ParametreEntity => ({
	pA_No: 0,
	pA_SMTP: "",
	pA_EmailDisplayName: "",
	pA_Port: null,
	pA_Mail: "",
	pA_MailCopie: "",
	pA_PWD: "",
	pA_SSL: false,
	pA_LogoSociete: "",
	pA_ImgFondEcran: "",
	d_RaisonSoc: "",
	aR_RefDivers: "",
	pA_UserSage: "",
	pA_Souche: null,
	pA_CompteCredit: "",
	pA_CompteDebit: "",
	pA_Journal: "",
	pA_DossierSage: "",
});

export default function ParametrePage() {
	const [tabValue, setTabValue] = useState(0);
	const [parametre, setParametre] = useState<ParametreEntity>(createDefaultParametre());
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [bgFile, setBgFile] = useState<File | null>(null);

	// Depots State
	const [depotsAutorises, setDepotsAutorises] = useState<DepotAutorise[]>([]);
	const [allDepots, setAllDepots] = useState<DepotItem[]>([]);
	const [depotPickerOpen, setDepotPickerOpen] = useState(false);
	const [selectedDepotNos, setSelectedDepotNos] = useState<number[]>([]);

	// Affaires State
	const [affairesAutorisees, setAffairesAutorisees] = useState<AffaireAutorise[]>([]);
	const [allAffaires, setAllAffaires] = useState<AffaireItem[]>([]);
	const [affairePickerOpen, setAffairePickerOpen] = useState(false);
	const [selectedAffaireNos, setSelectedAffaireNos] = useState<string[]>([]);

	// Categories State
	const [categoriesAutorisees, setCategoriesAutorisees] = useState<CategorieAutorise[]>([]);
	const [cataloguesN1, setCataloguesN1] = useState<SelectOptionItem<number>[]>([]);
	const [cataloguesN2, setCataloguesN2] = useState<SelectOptionItem<number>[]>([]);
	const [cataloguesN3, setCataloguesN3] = useState<SelectOptionItem<number>[]>([]);
	const [cataloguesN4, setCataloguesN4] = useState<SelectOptionItem<number>[]>([]);
	const [selectedCL1, setSelectedCL1] = useState<number>(0);
	const [selectedCL2, setSelectedCL2] = useState<number>(0);
	const [selectedCL3, setSelectedCL3] = useState<number>(0);
	const [selectedCL4, setSelectedCL4] = useState<number>(0);

	const [motifs, setMotifs] = useState<MotifRectification[]>([]);
	const [motifPagination, setMotifPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [motifTotal, setMotifTotal] = useState(0);
	const [motifLoading, setMotifLoading] = useState(false);
	const [motifModalOpen, setMotifModalOpen] = useState(false);
	const [motifSaving, setMotifSaving] = useState(false);
	const [motifPayload, setMotifPayload] = useState<MotifRectificationPayload>(createDefaultMotif());
	const [selectedMotif, setSelectedMotif] = useState<MotifRectification | null>(null);

	// Comptabilisation dropdowns
	const [journaux, setJournaux] = useState<SelectOption[]>([]);
	const [comptes, setComptes] = useState<SelectOption[]>([]);
	const [usersSage, setUsersSage] = useState<string[]>([]);
	const [souches, setSouches] = useState<SoucheItem[]>([]);
	const [articles, setArticles] = useState<SelectOption[]>([]);

	const loadAll = useCallback(async () => {
		setIsLoading(true);
		try {
			const [
				param,
				motifData,
				depotsAutorisesData,
				depotsData,
				affairesAutoriseesData,
				affairesData,
				categoriesData,
				cataloguesData,
				journauxData,
				comptesData,
				usersSageData,
				souchesData,
				articlesData,
			] = await Promise.all([
				parametresService.getParametre(),
				parametresService.getRectificationMotifs({ pageIndex: 1, pageSize: 500 }),
				parametresService.getDepotsAutorises({ pageIndex: 1, pageSize: 300 }),
				parametresService.getDepots({ pageIndex: 1, pageSize: 1000 }),
				parametresService.getAffairesAutorisees({ pageIndex: 1, pageSize: 300 }),
				parametresService.getAffaires({ pageIndex: 1, pageSize: 1000 }),
				parametresService.getCategoriesAutorisees({ pageIndex: 1, pageSize: 300 }),
				parametresService.getCataloguesForSelect(0),
				parametresService.getJournaux(),
				parametresService.getComptes(),
				parametresService.getUsersSage(),
				parametresService.getSouches(),
				parametresService.getArticles(),
			]);
			setParametre(param);
			setMotifs(motifData.data);
			setMotifTotal(motifData.itemsCount);
			setDepotsAutorises(depotsAutorisesData.data);
			setAllDepots(depotsData.data);
			setAffairesAutorisees(affairesAutoriseesData.data);
			setAllAffaires(affairesData.data);
			setCategoriesAutorisees(categoriesData.data);
			setCataloguesN1(cataloguesData);
			setJournaux(journauxData);
			setComptes(comptesData);
			setUsersSage(usersSageData);
			setSouches(souchesData);
			setArticles(articlesData);

			// Debug: Check what data we received
			console.log("Journaux:", journauxData);
			console.log("Comptes:", comptesData);
			console.log("Users Sage:", usersSageData);
			console.log("Souches:", souchesData);
			console.log("Articles:", articlesData);
			console.log("Articles length:", articlesData.length);
			console.log("First article:", articlesData[0]);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur chargement");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	useEffect(() => {
		const loadMotifsData = async () => {
			setMotifLoading(true);
			try {
				const data = await parametresService.getRectificationMotifs({
					pageIndex: motifPagination.page + 1,
					pageSize: motifPagination.pageSize,
				});
				setMotifs(data.data);
				setMotifTotal(data.itemsCount);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Erreur chargement motifs");
			} finally {
				setMotifLoading(false);
			}
		};
		void loadMotifsData();
	}, [motifPagination.page, motifPagination.pageSize]);

	const handleSaveParametre = async () => {
		try {
			setIsSaving(true);
			await parametresService.saveParametre(parametre);
			toast.success("Paramètres enregistrés avec succès");
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur enregistrement");
		} finally {
			setIsSaving(false);
		}
	};

	const handleSelectMotif = (item: MotifRectification) => {
		setSelectedMotif(item);
		setMotifPayload({
			mR_No: item.mR_No,
			mR_Code: item.mR_Code,
			mR_Desgination: item.mR_Desgination,
			mR_TypeMotif: item.mR_TypeMotif,
			mR_TypeDemande: item.mR_TypeDemande,
		});
	};

	const handleOpenMotifModal = async (item?: MotifRectification) => {
		if (item) {
			handleSelectMotif(item);
		} else {
			setSelectedMotif(null);
			// Get next code from API
			try {
				const nextCode = await parametresService.getNextMotifCode();
				setMotifPayload({
					mR_No: 0,
					mR_Code: nextCode || "",
					mR_Desgination: "",
					mR_TypeMotif: 0,
					mR_TypeDemande: 0,
				});
			} catch (error) {
				toast.error("Erreur récupération du code");
				setMotifPayload(createDefaultMotif());
			}
		}
		setMotifModalOpen(true);
	};

	const handleSaveMotif = async () => {
		if (!motifPayload.mR_Code.trim() || !motifPayload.mR_Desgination.trim()) {
			toast.error("Veuillez remplir tous les champs obligatoires");
			return;
		}
		try {
			setMotifSaving(true);
			await parametresService.addOrUpdateRectificationMotif(motifPayload);
			toast.success(selectedMotif ? "Motif modifié avec succès" : "Motif créé avec succès");
			setMotifModalOpen(false);
			setSelectedMotif(null);
			setMotifPagination({ page: 0, pageSize: motifPagination.pageSize });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur enregistrement");
		} finally {
			setMotifSaving(false);
		}
	};

	const handleDeleteMotif = async (mR_No: number) => {
		if (!window.confirm("Voulez-vous vraiment supprimer ce motif ?")) return;
		try {
			await parametresService.deleteRectificationMotif(mR_No);
			toast.success("Motif supprimé avec succès");
			setMotifPagination({ page: 0, pageSize: motifPagination.pageSize });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur suppression");
		}
	};

	const handleClearSelection = () => {
		setSelectedMotif(null);
		setMotifPayload(createDefaultMotif());
	};

	// Logo & Background preview
	const logoPreview = useMemo(() => {
		if (logoFile) return URL.createObjectURL(logoFile);
		if (parametre.pA_LogoSociete) {
			const normalized = parametre.pA_LogoSociete.replace(/\\/g, "/");
			const idx = normalized.toLowerCase().indexOf("/pictures/");
			return idx >= 0 ? normalized.substring(idx) : normalized;
		}
		return undefined;
	}, [logoFile, parametre.pA_LogoSociete]);

	const bgPreview = useMemo(() => {
		if (bgFile) return URL.createObjectURL(bgFile);
		if (parametre.pA_ImgFondEcran) {
			const normalized = parametre.pA_ImgFondEcran.replace(/\\/g, "/");
			const idx = normalized.toLowerCase().indexOf("/pictures/");
			return idx >= 0 ? normalized.substring(idx) : normalized;
		}
		return undefined;
	}, [bgFile, parametre.pA_ImgFondEcran]);

	// Handle Save Parametre with files
	const handleSaveParametreWithFiles = async () => {
		try {
			setIsSaving(true);
			await parametresService.saveParametre(parametre, logoFile || undefined, bgFile || undefined);
			toast.success("Paramètres enregistrés avec succès");
			setLogoFile(null);
			setBgFile(null);
			await loadAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur enregistrement");
		} finally {
			setIsSaving(false);
		}
	};

	// Depot Handlers
	const openDepotPicker = () => {
		setSelectedDepotNos([]);
		setDepotPickerOpen(true);
	};

	const handleAddDepots = async () => {
		if (selectedDepotNos.length === 0) {
			toast.error("Veuillez sélectionner au moins un dépôt");
			return;
		}
		try {
			await parametresService.addDepotAutorise(selectedDepotNos);
			toast.success("Dépôts ajoutés avec succès");
			setDepotPickerOpen(false);
			const [depotsAutorisesData, depotsData] = await Promise.all([
				parametresService.getDepotsAutorises({ pageIndex: 1, pageSize: 300 }),
				parametresService.getDepots({ pageIndex: 1, pageSize: 1000 }),
			]);
			setDepotsAutorises(depotsAutorisesData.data);
			setAllDepots(depotsData.data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur ajout dépôts");
		}
	};

	const handleDeleteDepot = async (daNo: number) => {
		if (!window.confirm("Voulez-vous vraiment supprimer ce dépôt ?")) return;
		try {
			await parametresService.deleteDepotAutorise(daNo);
			toast.success("Dépôt supprimé avec succès");
			const [depotsAutorisesData, depotsData] = await Promise.all([
				parametresService.getDepotsAutorises({ pageIndex: 1, pageSize: 300 }),
				parametresService.getDepots({ pageIndex: 1, pageSize: 1000 }),
			]);
			setDepotsAutorises(depotsAutorisesData.data);
			setAllDepots(depotsData.data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur suppression");
		}
	};

	// Affaire Handlers
	const openAffairePicker = () => {
		setSelectedAffaireNos([]);
		setAffairePickerOpen(true);
	};

	const handleAddAffaires = async () => {
		if (selectedAffaireNos.length === 0) {
			toast.error("Veuillez sélectionner au moins une affaire");
			return;
		}
		try {
			await parametresService.addAffairesAutorisees(selectedAffaireNos);
			toast.success("Affaires ajoutées avec succès");
			setAffairePickerOpen(false);
			const [affairesAutoriseesData, affairesData] = await Promise.all([
				parametresService.getAffairesAutorisees({ pageIndex: 1, pageSize: 300 }),
				parametresService.getAffaires({ pageIndex: 1, pageSize: 1000 }),
			]);
			setAffairesAutorisees(affairesAutoriseesData.data);
			setAllAffaires(affairesData.data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur ajout affaires");
		}
	};

	const handleDeleteAffaire = async (faNo: number) => {
		if (!window.confirm("Voulez-vous vraiment supprimer cette affaire ?")) return;
		try {
			await parametresService.deleteAffaireAutorisee(faNo);
			toast.success("Affaire supprimée avec succès");
			const [affairesAutoriseesData, affairesData] = await Promise.all([
				parametresService.getAffairesAutorisees({ pageIndex: 1, pageSize: 300 }),
				parametresService.getAffaires({ pageIndex: 1, pageSize: 1000 }),
			]);
			setAffairesAutorisees(affairesAutoriseesData.data);
			setAllAffaires(affairesData.data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur suppression");
		}
	};

	// Category Handlers
	const handleCL1Change = async (value: number) => {
		setSelectedCL1(value);
		setSelectedCL2(0);
		setSelectedCL3(0);
		setSelectedCL4(0);
		setCataloguesN2([]);
		setCataloguesN3([]);
		setCataloguesN4([]);
		if (value > 0) {
			try {
				const data = await parametresService.getCataloguesForSelect(value);
				setCataloguesN2(data);
			} catch (error) {
				toast.error("Erreur chargement catalogues");
			}
		}
	};

	const handleCL2Change = async (value: number) => {
		setSelectedCL2(value);
		setSelectedCL3(0);
		setSelectedCL4(0);
		setCataloguesN3([]);
		setCataloguesN4([]);
		if (value > 0) {
			try {
				const data = await parametresService.getCataloguesForSelect(value);
				setCataloguesN3(data);
			} catch (error) {
				toast.error("Erreur chargement catalogues");
			}
		}
	};

	const handleCL3Change = async (value: number) => {
		setSelectedCL3(value);
		setSelectedCL4(0);
		setCataloguesN4([]);
		if (value > 0) {
			try {
				const data = await parametresService.getCataloguesForSelect(value);
				setCataloguesN4(data);
			} catch (error) {
				toast.error("Erreur chargement catalogues");
			}
		}
	};

	const handleCL4Change = (value: number) => {
		setSelectedCL4(value);
	};

	const handleAddCategorie = async () => {
		if (selectedCL1 === 0) {
			toast.error("Veuillez sélectionner au moins le catalogue 1");
			return;
		}
		try {
			const payload: CategoriePayload = {
				cA_No: 0,
				cL_No1: selectedCL1,
				cL_No2: selectedCL2,
				cL_No3: selectedCL3,
				cL_No4: selectedCL4,
			};
			await parametresService.addOrUpdateCategorieAutorisee(payload);
			toast.success("Catégorie ajoutée avec succès");
			setSelectedCL1(0);
			setSelectedCL2(0);
			setSelectedCL3(0);
			setSelectedCL4(0);
			const [categoriesData, cataloguesData] = await Promise.all([
				parametresService.getCategoriesAutorisees({ pageIndex: 1, pageSize: 300 }),
				parametresService.getCataloguesForSelect(0),
			]);
			setCategoriesAutorisees(categoriesData.data);
			setCataloguesN1(cataloguesData);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur ajout catégorie");
		}
	};

	const handleDeleteCategorie = async (caNo: number) => {
		if (!window.confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
		try {
			await parametresService.deleteCategorieAutorisee(caNo);
			toast.success("Catégorie supprimée avec succès");
			const [categoriesData, cataloguesData] = await Promise.all([
				parametresService.getCategoriesAutorisees({ pageIndex: 1, pageSize: 300 }),
				parametresService.getCataloguesForSelect(0),
			]);
			setCategoriesAutorisees(categoriesData.data);
			setCataloguesN1(cataloguesData);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur suppression");
		}
	};

	const motifColumns: GridColDef<MotifRectification>[] = [
		{
			field: "mR_Code",
			headerName: "Code",
			width: 130,
			headerAlign: "center",
			align: "center",
			renderCell: (params) => (
				<Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
					{params.value}
				</Typography>
			),
		},
		{
			field: "mR_Desgination",
			headerName: "Désignation",
			flex: 1,
			renderCell: (params) => (
				<Typography variant="body2" sx={{ fontWeight: 500 }}>
					{params.value}
				</Typography>
			),
		},
		{
			field: "mR_TypeMotif",
			headerName: "Type de motif",
			width: 220,
			headerAlign: "center",
			align: "center",
			renderCell: (params) => {
				const type = MOTIF_TYPE_OPTIONS.find((opt) => opt.value === params.value);
				const typeConfig: Record<number, { label: string; color: string; bgColor: string }> = {
					0: { label: "Rectification", color: "#1565c0", bgColor: "#e3f2fd" },
					1: { label: "Annulation", color: "#00838f", bgColor: "#e0f7fa" },
					2: { label: "Modification", color: "#f57f17", bgColor: "#fff9c4" },
					3: { label: "Autre", color: "#c62828", bgColor: "#ffebee" },
				};
				const config = typeConfig[params.value] || { label: "Inconnu", color: "#616161", bgColor: "#f5f5f5" };
				return (
					<Box
						sx={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: config.bgColor,
							color: config.color,
							borderRadius: "12px",
							padding: "0px 0px",
							fontSize: "11px",
							fontWeight: 600,
							border: `1px solid ${config.color}30`,
							boxShadow: `0 1px 4px ${config.color}15`,
							minWidth: "120px",
							width: "fit-content",
							letterSpacing: "0.2px",
							transition: "all 0.2s ease",
							"&:hover": {
								boxShadow: `0 2px 8px ${config.color}25`,
							},
						}}
					>
						{type?.label || config.label}
					</Box>
				);
			},
		},
		{
			field: "actions",
			headerName: "Actions",
			width: 120,
			sortable: false,
			filterable: false,
			renderCell: (params) => (
				<Stack direction="row" spacing={0.5}>
					<Tooltip title="Modifier">
						<IconButton
							size="small"
							color="primary"
							onClick={(e) => {
								e.stopPropagation();
								handleOpenMotifModal(params.row);
							}}
						>
							<EditIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Supprimer">
						<IconButton
							size="small"
							color="error"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteMotif(params.row.mR_No);
							}}
						>
							<DeleteIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Stack>
			),
		},
	];

	if (isLoading) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography>Chargement...</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
				Paramètres
			</Typography>

			<Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
				<Tab label="Logo & Fond" />
				<Tab label="Dépôts" />
				<Tab label="Affaires" />
				<Tab label="Catégories" />
				<Tab label="E-Mail" />
				<Tab label="Comptabilisation" />
				<Tab label="Rectification Motif" />
				<Tab label="Autre" />
			</Tabs>

			{/* Logo & Fond Tab */}
			{tabValue === 0 && (
				<Card variant="outlined">
					<CardContent>
						<Stack spacing={3}>
							<Grid container spacing={3}>
								<Grid size={{ xs: 12, md: 6 }}>
									<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
										Logo Société
									</Typography>
									{logoPreview ? (
										<Box sx={{ mb: 2 }}>
											<Avatar src={logoPreview} sx={{ width: 120, height: 120 }} variant="rounded" />
										</Box>
									) : (
										<Box
											sx={{
												width: 120,
												height: 120,
												mb: 2,
												bgcolor: "grey.200",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												borderRadius: 2,
											}}
										>
											<ImageIcon sx={{ fontSize: 40, color: "grey.500" }} />
										</Box>
									)}
									<Button
										variant="outlined"
										startIcon={<UploadIcon />}
										onClick={() => document.getElementById("logo-upload")?.click()}
									>
										Choisir un logo
									</Button>
									<input
										id="logo-upload"
										type="file"
										accept="image/*"
										style={{ display: "none" }}
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) setLogoFile(file);
										}}
									/>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
										Fond d'écran de connexion
									</Typography>
									{bgPreview ? (
										<Box sx={{ mb: 2 }}>
											<img
												src={bgPreview}
												alt="Background"
												style={{ width: "100%", maxWidth: 300, height: 120, objectFit: "cover", borderRadius: 8 }}
											/>
										</Box>
									) : (
										<Box
											sx={{
												width: "100%",
												maxWidth: 300,
												height: 120,
												mb: 2,
												bgcolor: "grey.200",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												borderRadius: 8,
											}}
										>
											<ImageIcon sx={{ fontSize: 40, color: "grey.500" }} />
										</Box>
									)}
									<Button
										variant="outlined"
										startIcon={<UploadIcon />}
										onClick={() => document.getElementById("bg-upload")?.click()}
									>
										Choisir un fond
									</Button>
									<input
										id="bg-upload"
										type="file"
										accept="image/*"
										style={{ display: "none" }}
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) setBgFile(file);
										}}
									/>
								</Grid>
							</Grid>
							<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
								<Button
									variant="contained"
									color="primary"
									onClick={handleSaveParametreWithFiles}
									disabled={isSaving}
									startIcon={<SaveIcon />}
								>
									{isSaving ? "Enregistrement..." : "Enregistrer"}
								</Button>
							</Box>
						</Stack>
					</CardContent>
				</Card>
			)}

			{/* Dépôts Autorisés Tab */}
			{tabValue === 1 && (
				<Stack spacing={3}>
					<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
						<Button variant="contained" color="primary" onClick={openDepotPicker} startIcon={<AddIcon />}>
							Ajouter
						</Button>
					</Box>
					<DataGrid
						rows={depotsAutorises}
						columns={[
							{ field: "dE_Intitule", headerName: "Intitulé dépôt", flex: 1 },
							{
								field: "actions",
								headerName: "Actions",
								width: 100,
								renderCell: (params) => (
									<Tooltip title="Supprimer">
										<IconButton size="small" color="error" onClick={() => handleDeleteDepot(params.row.dA_No)}>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								),
							},
						]}
						getRowId={(row) => row.dA_No ?? 0}
						pageSizeOptions={[10, 25, 50]}
						density="compact"
						sx={{ minHeight: 300 }}
					/>
				</Stack>
			)}

			{/* Affaires Autorisées Tab */}
			{tabValue === 2 && (
				<Stack spacing={3}>
					<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
						<Button variant="contained" color="primary" onClick={openAffairePicker} startIcon={<AddIcon />}>
							Ajouter
						</Button>
					</Box>
					<DataGrid
						rows={affairesAutorisees}
						columns={[
							{ field: "cA_Num", headerName: "Numéro", width: 150 },
							{ field: "cA_Intitule", headerName: "Intitulé", flex: 1 },
							{
								field: "actions",
								headerName: "Actions",
								width: 100,
								renderCell: (params) => (
									<Tooltip title="Supprimer">
										<IconButton size="small" color="error" onClick={() => handleDeleteAffaire(params.row.fA_No)}>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								),
							},
						]}
						getRowId={(row) => row.fA_No}
						pageSizeOptions={[10, 25, 50]}
						density="compact"
						sx={{ minHeight: 300 }}
					/>
				</Stack>
			)}

			{/* Catégories Autorisées Tab */}
			{tabValue === 3 && (
				<Stack spacing={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
								Sélectionner les catalogues
							</Typography>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 3 }}>
									<TextField
										select
										label="Catalogue 1"
										value={selectedCL1}
										onChange={(e) => handleCL1Change(Number(e.target.value))}
										fullWidth
										size="small"
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{cataloguesN1.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, sm: 3 }}>
									<TextField
										select
										label="Catalogue 2"
										value={selectedCL2}
										onChange={(e) => handleCL2Change(Number(e.target.value))}
										fullWidth
										size="small"
										disabled={selectedCL1 === 0}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{cataloguesN2.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, sm: 3 }}>
									<TextField
										select
										label="Catalogue 3"
										value={selectedCL3}
										onChange={(e) => handleCL3Change(Number(e.target.value))}
										fullWidth
										size="small"
										disabled={selectedCL2 === 0}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{cataloguesN3.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, sm: 3 }}>
									<TextField
										select
										label="Catalogue 4"
										value={selectedCL4}
										onChange={(e) => handleCL4Change(Number(e.target.value))}
										fullWidth
										size="small"
										disabled={selectedCL3 === 0}
									>
										<MenuItem value={0}>Choisir</MenuItem>
										{cataloguesN4.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
							</Grid>
							<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
								<Button variant="contained" color="primary" onClick={handleAddCategorie} startIcon={<AddIcon />}>
									Ajouter catégorie
								</Button>
							</Box>
						</CardContent>
					</Card>
					<DataGrid
						rows={categoriesAutorisees}
						columns={[
							{ field: "cL_Intitule1", headerName: "Catalogue 1", width: 200 },
							{ field: "cL_Intitule2", headerName: "Catalogue 2", width: 200 },
							{ field: "cL_Intitule3", headerName: "Catalogue 3", width: 200 },
							{ field: "cL_Intitule4", headerName: "Catalogue 4", width: 200 },
							{
								field: "actions",
								headerName: "Actions",
								width: 100,
								renderCell: (params) => (
									<Tooltip title="Supprimer">
										<IconButton size="small" color="error" onClick={() => handleDeleteCategorie(params.row.cA_No)}>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								),
							},
						]}
						getRowId={(row) => row.cA_No}
						pageSizeOptions={[10, 25, 50]}
						density="compact"
						sx={{ minHeight: 300 }}
					/>
				</Stack>
			)}

			{/* E-Mail Tab */}
			{tabValue === 4 && (
				<Card variant="outlined">
					<CardContent>
						<Stack spacing={3}>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										label="Display Name"
										value={parametre.pA_EmailDisplayName || ""}
										onChange={(e) => setParametre({ ...parametre, pA_EmailDisplayName: e.target.value })}
										fullWidth
										size="small"
									/>
								</Grid>
							</Grid>

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 8 }}>
									<TextField
										label="SMTP"
										value={parametre.pA_SMTP || ""}
										onChange={(e) => setParametre({ ...parametre, pA_SMTP: e.target.value })}
										fullWidth
										size="small"
									/>
								</Grid>
								<Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex", alignItems: "center" }}>
									<FormControlLabel
										control={
											<Switch
												checked={parametre.pA_SSL || false}
												onChange={(e) => setParametre({ ...parametre, pA_SSL: e.target.checked })}
											/>
										}
										label="SSL"
									/>
								</Grid>
							</Grid>

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										label="Port"
										type="number"
										value={parametre.pA_Port || ""}
										onChange={(e) => setParametre({ ...parametre, pA_Port: Number(e.target.value) })}
										fullWidth
										size="small"
									/>
								</Grid>
							</Grid>

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										label="Email"
										type="email"
										value={parametre.pA_Mail || ""}
										onChange={(e) => setParametre({ ...parametre, pA_Mail: e.target.value })}
										fullWidth
										size="small"
									/>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										label="Password"
										type="password"
										value={parametre.pA_PWD || ""}
										onChange={(e) => setParametre({ ...parametre, pA_PWD: e.target.value })}
										fullWidth
										size="small"
									/>
								</Grid>
							</Grid>

							<Grid container spacing={2}>
								<Grid size={{ xs: 12 }}>
									<TextField
										label="Email Copie"
										value={parametre.pA_MailCopie || ""}
										onChange={(e) => setParametre({ ...parametre, pA_MailCopie: e.target.value })}
										fullWidth
										size="small"
									/>
								</Grid>
							</Grid>

							<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
								<Button
									variant="contained"
									color="primary"
									onClick={handleSaveParametre}
									disabled={isSaving}
									startIcon={<SaveIcon />}
								>
									{isSaving ? "Enregistrement..." : "Enregistrer"}
								</Button>
							</Box>
						</Stack>
					</CardContent>
				</Card>
			)}

			{/* Comptabilisation Tab */}
			{tabValue === 5 && (
				<Card variant="outlined">
					<CardContent>
						<Stack spacing={3}>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 4 }}>
									<TextField
										select
										label="Journal"
										value={parametre.pA_Journal || ""}
										onChange={(e) => setParametre({ ...parametre, pA_Journal: e.target.value })}
										fullWidth
										size="small"
									>
										<MenuItem value="">Choisir</MenuItem>
										{journaux.map((j) => (
											<MenuItem key={j.value} value={j.value}>
												{j.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, md: 4 }}>
									<TextField
										select
										label="Compte Débit"
										value={parametre.pA_CompteDebit || ""}
										onChange={(e) => setParametre({ ...parametre, pA_CompteDebit: e.target.value })}
										fullWidth
										size="small"
									>
										<MenuItem value="">Choisir</MenuItem>
										{comptes.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, md: 4 }}>
									<TextField
										select
										label="Compte Crédit"
										value={parametre.pA_CompteCredit || ""}
										onChange={(e) => setParametre({ ...parametre, pA_CompteCredit: e.target.value })}
										fullWidth
										size="small"
									>
										<MenuItem value="">Choisir</MenuItem>
										{comptes.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
							</Grid>

							<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
								<Button
									variant="contained"
									color="primary"
									onClick={handleSaveParametre}
									disabled={isSaving}
									startIcon={<SaveIcon />}
								>
									{isSaving ? "Enregistrement..." : "Enregistrer"}
								</Button>
							</Box>
						</Stack>
					</CardContent>
				</Card>
			)}

			{/* Rectification Motif Tab */}
			{tabValue === 6 && (
				<Stack spacing={3}>
					<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
						<Button variant="contained" color="primary" onClick={() => handleOpenMotifModal()} startIcon={<AddIcon />}>
							Ajouter un motif
						</Button>
					</Box>

					<DataGrid
						rows={motifs}
						columns={motifColumns}
						loading={motifLoading}
						rowCount={motifTotal}
						paginationMode="server"
						getRowId={(row) => row.mR_No}
						paginationModel={motifPagination}
						onPaginationModelChange={setMotifPagination}
						onRowClick={(params) => handleSelectMotif(params.row)}
						pageSizeOptions={[10, 25, 50]}
						density="compact"
						rowHeight={60}
						sx={{
							minHeight: 400,
							"& .MuiDataGrid-row:hover": {
								backgroundColor: "action.hover",
								cursor: "pointer",
							},
							"& .MuiDataGrid-cell": {
								borderBottom: "1px solid rgba(224, 224, 224, 0.5)",
								py: 1,
							},
							"& .MuiDataGrid-row": {
								minHeight: "60px !important",
								maxHeight: "60px !important",
							},
						}}
					/>
				</Stack>
			)}

			{/* Autre Tab */}
			{tabValue === 7 && (
				<Card variant="outlined">
					<CardContent>
						<Stack spacing={3}>
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										select
										label="Utilisateur Sage"
										value={parametre.pA_UserSage || ""}
										onChange={(e) => setParametre({ ...parametre, pA_UserSage: e.target.value })}
										fullWidth
										size="small"
									>
										<MenuItem value="">Choisir</MenuItem>
										{usersSage.map((user) => (
											<MenuItem key={user} value={user}>
												{user}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										select
										label="Souche document"
										value={parametre.pA_Souche || ""}
										onChange={(e) => setParametre({ ...parametre, pA_Souche: Number(e.target.value) })}
										fullWidth
										size="small"
									>
										<MenuItem value="">Choisir</MenuItem>
										{souches.map((s) => (
											<MenuItem key={s.cbMarq} value={s.cbMarq}>
												{s.s_Intitule}
											</MenuItem>
										))}
									</TextField>
								</Grid>
							</Grid>

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										select
										label="Article divers"
										value={parametre.aR_RefDivers || ""}
										onChange={(e) => setParametre({ ...parametre, aR_RefDivers: e.target.value })}
										fullWidth
										size="small"
									>
										<MenuItem value="">Choisir</MenuItem>
										{articles.map((a) => (
											<MenuItem key={a.value} value={a.value}>
												{a.text}
											</MenuItem>
										))}
									</TextField>
								</Grid>
								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										label="Dossier Sage"
										value={parametre.pA_DossierSage || ""}
										onChange={(e) => setParametre({ ...parametre, pA_DossierSage: e.target.value })}
										fullWidth
										size="small"
									/>
								</Grid>
							</Grid>

							<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
								<Button
									variant="contained"
									color="primary"
									onClick={handleSaveParametre}
									disabled={isSaving}
									startIcon={<SaveIcon />}
								>
									{isSaving ? "Enregistrement..." : "Enregistrer"}
								</Button>
							</Box>
						</Stack>
					</CardContent>
				</Card>
			)}

			<Dialog open={motifModalOpen} onClose={() => setMotifModalOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>{selectedMotif ? "Modifier le motif" : "Nouveau motif"}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12, sm: 6 }}>
								<TextField
									label="Code"
									value={motifPayload.mR_Code}
									onChange={(e) => setMotifPayload({ ...motifPayload, mR_Code: e.target.value })}
									fullWidth
									size="small"
									disabled={!!selectedMotif}
								/>
							</Grid>
							<Grid size={{ xs: 12, sm: 6 }}>
								<TextField
									select
									label="Type motif"
									value={motifPayload.mR_TypeMotif}
									onChange={(e) => setMotifPayload({ ...motifPayload, mR_TypeMotif: Number(e.target.value) })}
									fullWidth
									size="small"
									disabled={!!selectedMotif}
								>
									{MOTIF_TYPE_OPTIONS.map((opt) => (
										<MenuItem key={opt.value} value={opt.value}>
											{opt.label}
										</MenuItem>
									))}
								</TextField>
							</Grid>
						</Grid>

						<TextField
							select
							label="Type demande"
							value={motifPayload.mR_TypeDemande}
							onChange={(e) => setMotifPayload({ ...motifPayload, mR_TypeDemande: Number(e.target.value) })}
							fullWidth
							size="small"
						>
							{MOTIF_DEMANDE_OPTIONS.map((opt) => (
								<MenuItem key={opt.value} value={opt.value}>
									{opt.label}
								</MenuItem>
							))}
						</TextField>

						<TextField
							label="Désignation"
							value={motifPayload.mR_Desgination}
							onChange={(e) => setMotifPayload({ ...motifPayload, mR_Desgination: e.target.value })}
							fullWidth
							size="small"
							multiline
							rows={3}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setMotifModalOpen(false)}>Annuler</Button>
					<Button variant="contained" onClick={handleSaveMotif} disabled={motifSaving}>
						{motifSaving ? "Enregistrement..." : "Enregistrer"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Depot Picker Modal */}
			<Dialog open={depotPickerOpen} onClose={() => setDepotPickerOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Sélectionner les dépôts</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Sélectionnez un ou plusieurs dépôts à ajouter:
						</Typography>
						<DataGrid
							rows={allDepots}
							columns={[
								{
									field: "__select__",
									headerName: "Sélection",
									width: 50,
									renderCell: (params) => {
										const depotNo = (params.row.dE_No ?? 0) as number;
										return (
											<input
												type="checkbox"
												checked={selectedDepotNos.includes(depotNo)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedDepotNos([...selectedDepotNos, depotNo]);
													} else {
														setSelectedDepotNos(selectedDepotNos.filter((no) => no !== depotNo));
													}
												}}
											/>
										);
									},
								},
								{ field: "dE_No", headerName: "Code", width: 100 },
								{ field: "dE_Intitule", headerName: "Intitulé", flex: 1 },
							]}
							getRowId={(row) => (row.dE_No ?? 0) as number}
							checkboxSelection={false}
							density="compact"
							sx={{ minHeight: 400 }}
							hideFooter
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDepotPickerOpen(false)}>Annuler</Button>
					<Button variant="contained" onClick={handleAddDepots} disabled={selectedDepotNos.length === 0}>
						Ajouter ({selectedDepotNos.length})
					</Button>
				</DialogActions>
			</Dialog>

			{/* Affaire Picker Modal */}
			<Dialog open={affairePickerOpen} onClose={() => setAffairePickerOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Sélectionner les affaires</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Sélectionnez une ou plusieurs affaires à ajouter:
						</Typography>
						<DataGrid
							rows={allAffaires}
							columns={[
								{
									field: "__select__",
									headerName: "Sélection",
									width: 50,
									renderCell: (params) => (
										<input
											type="checkbox"
											checked={selectedAffaireNos.includes(params.row.cA_Num)}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedAffaireNos([...selectedAffaireNos, params.row.cA_Num]);
												} else {
													setSelectedAffaireNos(selectedAffaireNos.filter((no) => no !== params.row.cA_Num));
												}
											}}
										/>
									),
								},
								{ field: "cA_Num", headerName: "Numéro", width: 150 },
								{ field: "cA_Intitule", headerName: "Intitulé", flex: 1 },
							]}
							getRowId={(row) => row.cA_Num}
							checkboxSelection={false}
							density="compact"
							sx={{ minHeight: 400 }}
							hideFooter
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAffairePickerOpen(false)}>Annuler</Button>
					<Button variant="contained" onClick={handleAddAffaires} disabled={selectedAffaireNos.length === 0}>
						Ajouter ({selectedAffaireNos.length})
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
