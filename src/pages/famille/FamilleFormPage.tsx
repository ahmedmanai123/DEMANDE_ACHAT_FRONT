import {
	Box,
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useFamilleStore } from "@/store/useFamilleStore";
import type { FAMILLEDto } from "@/types/famille";

interface FamilleFormPageProps {
	cbMarq: number;
	onBack: () => void;
}

const FamilleFormPage: React.FC<FamilleFormPageProps> = ({ cbMarq, onBack }) => {
	const navigate = useNavigate();
	const { getFamilleById, createFamille, updateFamille, famillesCentral } = useFamilleStore();

	const [formData, setFormData] = useState<Partial<FAMILLEDto>>({
		FA_CodeFamille: "",
		FA_Intitule: "",
		FA_Type: 0,
		FA_Central: undefined,
		CL_No1: 0,
		CL_No2: 0,
		CL_No3: 0,
		CL_No4: 0,
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isEdit = cbMarq > 0;

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (isEdit) {
			loadFamille();
		}
	}, [cbMarq, isEdit]);

	const loadFamille = async () => {
		try {
			setLoading(true);
			const famille = await getFamilleById(cbMarq);
			if (famille) {
				setFormData(famille);
			}
		} catch (err) {
			setError("Erreur lors du chargement de la famille");
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof FAMILLEDto, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			if (isEdit) {
				await updateFamille(formData as FAMILLEDto);
			} else {
				await createFamille(formData as Omit<FAMILLEDto, "cbMarq">);
			}
			onBack();
		} catch (err: any) {
			setError(err.message || "Erreur lors de l'enregistrement");
		} finally {
			setLoading(false);
		}
	};

	const handleBack = () => {
		onBack();
	};

	if (loading && isEdit) {
		return <Box>Chargement...</Box>;
	}

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h5" sx={{ mb: 3 }}>
				{isEdit ? "Modifier la famille" : "Nouvelle famille"}
			</Typography>

			{error && (
				<Box sx={{ mb: 2, p: 2, bgcolor: "error.light", borderRadius: 1 }}>
					<Typography color="error">{error}</Typography>
				</Box>
			)}

			<form onSubmit={handleSubmit}>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 600 }}>
					<TextField
						label="Code famille"
						value={formData.FA_CodeFamille || ""}
						onChange={(e) => handleInputChange("FA_CodeFamille", e.target.value)}
						required
						fullWidth
					/>

					<TextField
						label="Intitulé"
						value={formData.FA_Intitule || ""}
						onChange={(e) => handleInputChange("FA_Intitule", e.target.value)}
						required
						fullWidth
					/>

					<FormControl fullWidth>
						<InputLabel>Type</InputLabel>
						<Select
							value={formData.FA_Type || 0}
							label="Type"
							onChange={(e) => handleInputChange("FA_Type", Number(e.target.value))}
						>
							<MenuItem value={0}>Détail</MenuItem>
							<MenuItem value={1}>Total</MenuItem>
							<MenuItem value={2}>Centralisateur</MenuItem>
						</Select>
					</FormControl>

					<FormControl fullWidth>
						<InputLabel>Centralisation</InputLabel>
						<Select
							value={formData.FA_Central || ""}
							label="Centralisation"
							onChange={(e) => handleInputChange("FA_Central", e.target.value || undefined)}
						>
							<MenuItem value="">Aucune</MenuItem>
							{famillesCentral.map((central) => (
								<MenuItem key={central.Value} value={central.Value}>
									{central.Text}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<Box sx={{ display: "flex", gap: 2, mt: 3 }}>
						<Button type="submit" variant="contained" disabled={loading}>
							{loading ? "Enregistrement..." : isEdit ? "Modifier" : "Créer"}
						</Button>
						<Button variant="outlined" onClick={handleBack}>
							Annuler
						</Button>
					</Box>
				</Box>
			</form>
		</Box>
	);
};

export default FamilleFormPage;
