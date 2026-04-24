import { ArrowBack, Visibility, VisibilityOff } from "@mui/icons-material";
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	InputAdornment,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router";
import { accountService } from "@/services/accountService";
import { type SelectOption, TypeCompte, type UserDto } from "@/types/account";

const TYPE_COMPTE_OPTIONS = [
	{ value: TypeCompte.Administrateur, label: "Administrateur" },
	{ value: TypeCompte.Approbateur, label: "Approbateur" },
	{ value: TypeCompte.Back_office, label: "Back office" },
	{ value: TypeCompte.Demandeur, label: "Demandeur" },
	{ value: TypeCompte.Acheteur, label: "Acheteur" },
];

export default function UserForm() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const isEditMode = Boolean(id);

	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const [user, setUser] = useState<Partial<UserDto>>({
		userName: "",
		us_UserIntitule: "",
		email: "",
		password: "",
		confirmPassword: "",
		us_TypeCompte: TypeCompte.Administrateur,
		ro_No: 0,
		idSalarie: null,
		idResponsable: "",
		us_Depots: [],
		us_Image: "",
		profilePic: null,
	});

	const [roles, setRoles] = useState<SelectOption[]>([]);
	const [depots, setDepots] = useState<SelectOption[]>([]);
	const [salaries, setSalaries] = useState<SelectOption[]>([]);
	const [responsables, setResponsables] = useState<SelectOption[]>([]);
	const [imagePreview, setImagePreview] = useState<string>("");

	const shouldShowDepots = () => {
		return user.us_TypeCompte === TypeCompte.Approbateur || user.us_TypeCompte === TypeCompte.Demandeur;
	};

	const shouldShowResponsable = () => {
		return user.us_TypeCompte === TypeCompte.Approbateur || user.us_TypeCompte === TypeCompte.Demandeur;
	};

	const shouldShowSalarie = () => {
		return user.us_TypeCompte === TypeCompte.Approbateur;
	};

	const shouldShowPasswordFields = () => {
		return !isEditMode;
	};

	const loadRoles = useCallback(async (typeCompte: number) => {
		try {
			const rolesData = await accountService.getRolesByAccountType(typeCompte);
			setRoles(rolesData);
		} catch (error) {
			console.error("Error loading roles:", error);
		}
	}, []);

	const loadDepots = useCallback(async (userId?: string) => {
		try {
			const depotsData = await accountService.getDepots(userId || "");
			setDepots(depotsData);
		} catch (error) {
			console.error("Error loading depots:", error);
		}
	}, []);

	const loadSalaries = useCallback(async (id?: number) => {
		try {
			const salariesData = await accountService.getSalaries(id || 0);
			setSalaries(salariesData);
		} catch (error) {
			console.error("Error loading salaries:", error);
		}
	}, []);

	const loadResponsables = useCallback(async (userId?: string) => {
		try {
			const responsablesData = await accountService.getResponsables(userId || "");
			setResponsables(responsablesData);
		} catch (error) {
			console.error("Error loading responsables:", error);
		}
	}, []);

	const loadUser = useCallback(async () => {
		if (!id) return;

		setLoading(true);
		try {
			const userData = await accountService.getUserById(id);
			setUser({
				...userData,
				password: "",
				confirmPassword: "",
			});
			if (userData.us_Image) {
				setImagePreview(userData.us_Image);
			}
			await loadRoles(userData.us_TypeCompte);
			await Promise.all([loadDepots(id), loadSalaries(userData.idSalarie || 0), loadResponsables(id)]);
		} catch (error) {
			toast.error("Erreur chargement utilisateur");
			navigate("/account/users");
		} finally {
			setLoading(false);
		}
	}, [id, navigate, loadRoles, loadDepots, loadSalaries, loadResponsables]);

	useEffect(() => {
		if (isEditMode) {
			loadUser();
		} else {
			loadRoles(TypeCompte.Administrateur);
			loadDepots();
			loadSalaries();
			loadResponsables();
		}
	}, [isEditMode, loadUser, loadRoles, loadDepots, loadSalaries, loadResponsables]);

	const handleTypeCompteChange = async (typeCompte: TypeCompte) => {
		setUser((prev) => ({
			...prev,
			us_TypeCompte: typeCompte,
			ro_No: 0,
			us_Depots: [],
			idSalarie: null,
			idResponsable: "",
		}));
		await loadRoles(typeCompte);
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setUser((prev) => ({ ...prev, profilePic: file }));
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!user.userName || !user.email || user.us_TypeCompte === undefined) {
			toast.error("Veuillez remplir tous les champs obligatoires");
			return;
		}

		if (!isEditMode && (!user.password || user.password !== user.confirmPassword)) {
			toast.error("Les mots de passe ne correspondent pas");
			return;
		}

		setSubmitting(true);
		try {
			// Send JSON instead of FormData to match backend [FromBody] RegisterDto
			// Backend expects PascalCase property names
			const registerData = {
				Id: user.id || "",
				UserName: user.userName || "",
				US_UserIntitule: user.us_UserIntitule || "",
				Email: user.email || "",
				US_TypeCompte: user.us_TypeCompte,
				RO_No: user.ro_No || 0,
				Password: user.password || "",
				ConfirmPassword: user.confirmPassword || "",
				IdSalarie: user.idSalarie || null,
				IdResponsable: user.idResponsable || "",
				US_Depots: user.us_Depots || [],
				US_Image: user.us_Image || "",
			};

			if (isEditMode && id) {
				await accountService.updateUser(id, registerData);
				toast.success("Utilisateur mis à jour avec succès");
			} else {
				await accountService.createUser(registerData);
				toast.success("Utilisateur créé avec succès");
			}

			navigate("/account/users");
		} catch (error: any) {
			console.error("[UserForm] Submit error:", error);
			console.error("[UserForm] Error response:", error.response?.data);
			console.error("[UserForm] Error status:", error.response?.status);

			// Extract and display validation errors from backend
			const errorMessage = error.message || error.response?.data?.title || "Erreur lors de l'enregistrement";

			// If there are validation errors, display them
			if (error.response?.data?.errors) {
				console.log("[UserForm] Validation errors:", error.response.data.errors);
				const validationErrors = Object.values(error.response.data.errors).flat();
				if (validationErrors.length > 0) {
					toast.error(validationErrors.join("\n"), {
						style: { whiteSpace: "pre-line" },
						duration: 5000,
					});
				} else {
					toast.error(errorMessage);
				}
			} else {
				toast.error(errorMessage);
			}
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3 }}>
			<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
				<IconButton onClick={() => navigate("/account/users")} sx={{ mr: 2 }}>
					<ArrowBack />
				</IconButton>
				<Typography variant="h5">{isEditMode ? "Modifier l'utilisateur" : "Nouveau utilisateur"}</Typography>
			</Box>

			<form onSubmit={handleSubmit}>
				<Grid container spacing={3}>
					{/* Left Column - Basic Info */}
					<Grid size={{ xs: 12, md: 6 }}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Informations de base
								</Typography>

								<TextField
									fullWidth
									label="Nom d'utilisateur *"
									value={user.userName || ""}
									onChange={(e) => setUser({ ...user, userName: e.target.value })}
									margin="normal"
									required
									size="small"
								/>

								<TextField
									fullWidth
									label="Nom d'affichage"
									value={user.us_UserIntitule || ""}
									onChange={(e) => setUser({ ...user, us_UserIntitule: e.target.value })}
									margin="normal"
									size="small"
								/>

								<TextField
									fullWidth
									select
									label="Type de compte *"
									value={user.us_TypeCompte ?? TypeCompte.Administrateur}
									onChange={(e) => handleTypeCompteChange(Number(e.target.value) as TypeCompte)}
									margin="normal"
									required
									size="small"
									disabled={isEditMode}
								>
									{TYPE_COMPTE_OPTIONS.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>

								<TextField
									fullWidth
									select
									label="Rôle *"
									value={user.ro_No || 0}
									onChange={(e) => setUser({ ...user, ro_No: Number(e.target.value) })}
									margin="normal"
									required
									size="small"
								>
									<MenuItem value={0}>Choisir</MenuItem>
									{roles.map((role) => (
										<MenuItem key={role.value} value={role.value}>
											{role.text}
										</MenuItem>
									))}
								</TextField>

								<TextField
									fullWidth
									label="Email *"
									type="email"
									value={user.email || ""}
									onChange={(e) => setUser({ ...user, email: e.target.value })}
									margin="normal"
									required
									size="small"
								/>

								{shouldShowPasswordFields() && (
									<>
										<TextField
											fullWidth
											label="Mot de passe *"
											type={showPassword ? "text" : "password"}
											value={user.password || ""}
											onChange={(e) => setUser({ ...user, password: e.target.value })}
											margin="normal"
											required
											size="small"
											slotProps={{
												input: {
													endAdornment: (
														<InputAdornment position="end">
															<IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
																{showPassword ? <VisibilityOff /> : <Visibility />}
															</IconButton>
														</InputAdornment>
													),
												},
											}}
										/>

										<TextField
											fullWidth
											label="Confirmer mot de passe *"
											type={showConfirmPassword ? "text" : "password"}
											value={user.confirmPassword || ""}
											onChange={(e) => setUser({ ...user, confirmPassword: e.target.value })}
											margin="normal"
											required
											size="small"
											slotProps={{
												input: {
													endAdornment: (
														<InputAdornment position="end">
															<IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
																{showConfirmPassword ? <VisibilityOff /> : <Visibility />}
															</IconButton>
														</InputAdornment>
													),
												},
											}}
										/>
									</>
								)}
							</CardContent>
						</Card>
					</Grid>

					{/* Right Column - Profile & Associations */}
					<Grid size={{ xs: 12, md: 6 }}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Profil et associations
								</Typography>

								<Box sx={{ mb: 3 }}>
									<Typography variant="body2" gutterBottom>
										Photo de profil
									</Typography>
									<input
										type="file"
										accept="image/*"
										onChange={handleFileChange}
										style={{ display: "none" }}
										id="profile-pic-upload"
									/>
									<label htmlFor="profile-pic-upload">
										<Button variant="outlined" component="span">
											{imagePreview ? "Changer la photo" : "Choisir une photo"}
										</Button>
									</label>
									{imagePreview && (
										<Box sx={{ mt: 2 }}>
											<img
												src={imagePreview}
												alt="Profile preview"
												style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "50%" }}
											/>
										</Box>
									)}
								</Box>

								{(shouldShowDepots() || shouldShowResponsable() || shouldShowSalarie()) && (
									<>
										<Typography variant="subtitle1" sx={{ mt: 2, mb: 2 }}>
											Utilisateurs associées
										</Typography>

										{shouldShowDepots() && (
											<TextField
												fullWidth
												select
												label="Dépots"
												value={user.us_Depots || []}
												onChange={(e) => {
													const value = e.target.value;
													setUser({
														...user,
														us_Depots: typeof value === "string" ? value.split(",").map(Number) : value,
													});
												}}
												margin="normal"
												size="small"
												slotProps={{
													select: {
														multiple: true,
														renderValue: (selected) => (
															<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
																{(selected as number[]).map((value) => {
																	const depot = depots.find((d) => d.value === value);
																	return <Chip key={value} label={depot?.text || value} />;
																})}
															</Box>
														),
													},
												}}
											>
												{depots.map((depot) => (
													<MenuItem key={depot.value} value={depot.value}>
														{depot.text}
													</MenuItem>
												))}
											</TextField>
										)}

										{shouldShowResponsable() && (
											<TextField
												fullWidth
												select
												label="Responsable"
												value={user.idResponsable || ""}
												onChange={(e) => setUser({ ...user, idResponsable: e.target.value })}
												margin="normal"
												size="small"
											>
												<MenuItem value="">Choisir</MenuItem>
												{responsables.map((resp) => (
													<MenuItem key={resp.value} value={resp.value}>
														{resp.text}
													</MenuItem>
												))}
											</TextField>
										)}

										{shouldShowSalarie() && (
											<TextField
												fullWidth
												select
												label="Salarié"
												value={user.idSalarie || 0}
												onChange={(e) => setUser({ ...user, idSalarie: Number(e.target.value) })}
												margin="normal"
												size="small"
											>
												<MenuItem value={0}>Choisir</MenuItem>
												{salaries.map((salary) => (
													<MenuItem key={salary.value} value={salary.value}>
														{salary.text}
													</MenuItem>
												))}
											</TextField>
										)}
									</>
								)}
							</CardContent>
						</Card>
					</Grid>

					{/* Action Buttons */}
					<Grid size={{ xs: 12 }}>
						<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
							<Button variant="outlined" onClick={() => navigate("/account/users")} disabled={submitting}>
								Annuler
							</Button>
							<Button type="submit" variant="contained" color="primary" disabled={submitting}>
								{submitting ? (
									<>
										<CircularProgress size={20} sx={{ mr: 1 }} />
										Enregistrement...
									</>
								) : (
									"Enregistrer"
								)}
							</Button>
						</Box>
					</Grid>
				</Grid>
			</form>
		</Box>
	);
}
