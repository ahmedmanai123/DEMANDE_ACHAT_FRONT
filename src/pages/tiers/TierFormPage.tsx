import { ArrowBack as ArrowBackIcon, Home as HomeIcon, Save as SaveIcon } from "@mui/icons-material";
import {
	Alert,
	Box,
	Breadcrumbs,
	Button,
	FormControl,
	InputLabel,
	Link,
	MenuItem,
	Paper,
	Select,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTiersStore } from "@/store/useTiersStore";
import type { F_COMPTETDto } from "@/types/tiers";

interface TierFormPageProps {
	cbMarq: number;
	onBack: () => void;
}

const TierFormPage: React.FC<TierFormPageProps> = ({ cbMarq, onBack }) => {
	const navigate = useNavigate();
	const CT_Type = 1; // Par défaut, on gère les fournisseurs

	const { loading, getTierById, createTier, updateTier, setSelectedTier } = useTiersStore();

	const [formData, setFormData] = useState<Partial<F_COMPTETDto>>({
		CT_Num: "",
		CT_Intitule: "",
		CT_Classement: "",
		CT_Contact: "",
		CT_Adresse: "",
		CT_Email: "",
		CT_Identifiant: "",
		CT_Sommeil: 0,
		CT_Type,
		CT_Telephone: "",
		CT_Fax: "",
		CT_Siret: "",
		CT_CodePostal: "",
		CT_Ville: "",
		CT_Pays: "",
	});

	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error" | "warning" | "info";
	}>({ open: false, message: "", severity: "info" });

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (cbMarq > 0) {
			loadTier(cbMarq);
		}
	}, [cbMarq]);

	const loadTier = async (id: number) => {
		try {
			const tier = await getTierById(id);
			if (tier) {
				setFormData(tier);
				setSelectedTier(tier);
			}
		} catch {
			setSnackbar({
				open: true,
				message: "Erreur lors du chargement du tiers",
				severity: "error",
			});
		}
	};

	const handleInputChange =
		(field: keyof F_COMPTETDto) => (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
			const value = event.target.value;
			setFormData((prev) => ({
				...prev,
				[field]: field === "CT_Sommeil" || field === "CT_Type" ? Number(value) : value,
			}));
		};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		try {
			if (cbMarq === 0) {
				await createTier(formData as Omit<F_COMPTETDto, "cbMarq">);
				setSnackbar({
					open: true,
					message: "Tiers créé avec succès",
					severity: "success",
				});
			} else {
				await updateTier(formData as F_COMPTETDto);
				setSnackbar({
					open: true,
					message: "Tiers mis à jour avec succès",
					severity: "success",
				});
			}

			setTimeout(() => {
				navigate("/tiers/fournisseurs");
			}, 1500);
		} catch {
			setSnackbar({
				open: true,
				message: cbMarq === 0 ? "Erreur lors de la création" : "Erreur lors de la mise à jour",
				severity: "error",
			});
		}
	};

	const handleBack = () => {
		onBack();
	};

	const handleCloseSnackbar = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	return (
		<Box sx={{ width: "100%", p: 2 }}>
			<Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
				<Link
					component="button"
					variant="body1"
					onClick={() => navigate("/")}
					sx={{ display: "flex", alignItems: "center" }}
				>
					<HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
					Accueil
				</Link>
				<Link component="button" variant="body1" onClick={() => navigate("/tiers/fournisseurs")}>
					{CT_Type === 1 ? "Fournisseurs" : "Clients"}
				</Link>
				<Typography color="text.primary">
					{cbMarq === 0 ? "Nouveau" : "Modifier"} {CT_Type === 1 ? "Fournisseur" : "Client"}
				</Typography>
			</Breadcrumbs>

			<Paper sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
				<Typography variant="h5" sx={{ mb: 3 }}>
					{cbMarq === 0 ? "Créer un" : "Modifier un"} {CT_Type === 1 ? "Fournisseur" : "Client"}
				</Typography>

				<form onSubmit={handleSubmit}>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								fullWidth
								label="Numéro"
								value={formData.CT_Num || ""}
								onChange={handleInputChange("CT_Num")}
								required
								disabled={loading}
							/>
							<TextField
								fullWidth
								label="Intitulé du compte"
								value={formData.CT_Intitule || ""}
								onChange={handleInputChange("CT_Intitule")}
								required
								disabled={loading}
							/>
						</Box>

						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								fullWidth
								label="Abrégé"
								value={formData.CT_Classement || ""}
								onChange={handleInputChange("CT_Classement")}
								disabled={loading}
							/>
							<TextField
								fullWidth
								label="Contact"
								value={formData.CT_Contact || ""}
								onChange={handleInputChange("CT_Contact")}
								disabled={loading}
							/>
						</Box>

						<TextField
							fullWidth
							label="Adresse"
							value={formData.CT_Adresse || ""}
							onChange={handleInputChange("CT_Adresse")}
							disabled={loading}
						/>

						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								fullWidth
								label="Code Postal"
								value={formData.CT_CodePostal || ""}
								onChange={handleInputChange("CT_CodePostal")}
								disabled={loading}
							/>
							<TextField
								fullWidth
								label="Ville"
								value={formData.CT_Ville || ""}
								onChange={handleInputChange("CT_Ville")}
								disabled={loading}
							/>
						</Box>

						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								fullWidth
								label="Pays"
								value={formData.CT_Pays || ""}
								onChange={handleInputChange("CT_Pays")}
								disabled={loading}
							/>
							<TextField
								fullWidth
								label="Téléphone"
								value={formData.CT_Telephone || ""}
								onChange={handleInputChange("CT_Telephone")}
								disabled={loading}
							/>
						</Box>

						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								fullWidth
								label="Fax"
								value={formData.CT_Fax || ""}
								onChange={handleInputChange("CT_Fax")}
								disabled={loading}
							/>
							<TextField
								fullWidth
								label="Email"
								type="email"
								value={formData.CT_Email || ""}
								onChange={handleInputChange("CT_Email")}
								disabled={loading}
							/>
						</Box>

						<Box sx={{ display: "flex", gap: 2 }}>
							<TextField
								fullWidth
								label="N° Identifiant"
								value={formData.CT_Identifiant || ""}
								onChange={handleInputChange("CT_Identifiant")}
								disabled={loading}
							/>
							<TextField
								fullWidth
								label="SIRET"
								value={formData.CT_Siret || ""}
								onChange={handleInputChange("CT_Siret")}
								disabled={loading}
							/>
						</Box>

						<FormControl fullWidth>
							<InputLabel>Statut</InputLabel>
							<Select
								value={formData.CT_Sommeil || 0}
								onChange={(e) => {
									const value = e.target.value as number;
									setFormData((prev) => ({ ...prev, CT_Sommeil: value }));
								}}
								disabled={loading}
							>
								<MenuItem value={0}>Actif</MenuItem>
								<MenuItem value={1}>En sommeil</MenuItem>
							</Select>
						</FormControl>

						<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
							<Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={loading}>
								Retour
							</Button>
							<Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />} disabled={loading}>
								{loading ? "Enregistrement..." : "Enregistrer"}
							</Button>
						</Box>
					</Box>
				</form>
			</Paper>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={handleCloseSnackbar}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default TierFormPage;
