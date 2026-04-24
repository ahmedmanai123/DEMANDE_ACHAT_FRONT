import { useEffect, useState } from "react";
import {
	Box,
	Button,
	FormControl,
	FormControlLabel,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import type { BesoinTypeItem, ReferenceData } from "@/types/besoinType";

interface BesoinTypeFormProps {
	data?: BesoinTypeItem;
	referenceData: ReferenceData;
	onChange: (data: BesoinTypeItem) => void;
}

export default function BesoinTypeForm({ data, referenceData, onChange }: BesoinTypeFormProps) {
	const [item, setItem] = useState<BesoinTypeItem>({
		bT_Id: 0,
		bT_Code: "",
		bT_Intitule: "",
		bT_DegreImportance: 0,
		bT_ModifDegreImportance: true,
	});

	useEffect(() => {
		if (data) setItem(data);
	}, [data]);

	const handleChange = (field: keyof BesoinTypeItem, value: unknown) => {
		const updated = { ...item, [field]: value };
		setItem(updated);
		onChange(updated);
	};

	return (
		<Stack spacing={2}>
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Code"
						value={item.bT_Code}
						onChange={(e) => handleChange("bT_Code", e.target.value)}
						fullWidth
						size="small"
						required
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Intitulé"
						value={item.bT_Intitule}
						onChange={(e) => handleChange("bT_Intitule", e.target.value)}
						fullWidth
						size="small"
						required
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Utilisateur Sage</InputLabel>
						<Select
							value={item.bT_UserSage || ""}
							label="Utilisateur Sage"
							onChange={(e) => handleChange("bT_UserSage", e.target.value)}
						>
							<MenuItem value=""><em>Choisir</em></MenuItem>
							{referenceData.usersSage.map((u) => (
								<MenuItem key={u.value} value={u.value}>{u.text}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Souche</InputLabel>
						<Select
							value={item.bT_Souche ?? ""}
							label="Souche"
							onChange={(e) => {
								const value = e.target.value as unknown as string | number;
								handleChange("bT_Souche", value === "" ? undefined : Number(value));
							}}
						>
							<MenuItem value=""><em>Choisir</em></MenuItem>
							{referenceData.souches.map((s) => (
								<MenuItem key={s.value} value={s.value}>{s.text}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Journal</InputLabel>
						<Select
							value={item.bT_Journal || ""}
							label="Journal"
							onChange={(e) => handleChange("bT_Journal", e.target.value)}
						>
							<MenuItem value=""><em>Choisir</em></MenuItem>
							{referenceData.journaux.map((j) => (
								<MenuItem key={j.value} value={j.value}>{j.text}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Compte Débit</InputLabel>
						<Select
							value={item.bT_CompteDebit || ""}
							label="Compte Débit"
							onChange={(e) => handleChange("bT_CompteDebit", e.target.value)}
						>
							<MenuItem value=""><em>Choisir</em></MenuItem>
							{referenceData.comptesDebit.map((c) => (
								<MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Compte Crédit</InputLabel>
						<Select
							value={item.bT_CompteCredit || ""}
							label="Compte Crédit"
							onChange={(e) => handleChange("bT_CompteCredit", e.target.value)}
						>
							<MenuItem value=""><em>Choisir</em></MenuItem>
							{referenceData.comptesCredit.map((c) => (
								<MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControl fullWidth size="small">
						<InputLabel>Article Divers</InputLabel>
						<Select
							value={item.aR_Ref || ""}
							label="Article Divers"
							onChange={(e) => handleChange("aR_Ref", e.target.value)}
						>
							<MenuItem value=""><em>Choisir</em></MenuItem>
							{referenceData.articles.map((a) => (
								<MenuItem key={a.value} value={a.value}>{a.text}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<FormControlLabel
						control={
							<Switch
								checked={item.bT_ModifDegreImportance || false}
								onChange={(e) => handleChange("bT_ModifDegreImportance", e.target.checked)}
							/>
						}
						label="Modifier degré importance"
					/>
				</Grid>
			</Grid>

			<Typography variant="subtitle2" sx={{ mt: 1 }}>Templates</Typography>
			<Grid container spacing={2}>
				{["bT_PathBCFile", "bT_PathDAFile", "bT_PathDBFile", "bT_PathDPFile"].map((field) => (
					<Grid size={{ xs: 12, sm: 6 }} key={field}>
						<Button variant="outlined" component="label" fullWidth size="small">
							{field.replace("bT_Path", "").replace("File", "")}
							<input
								type="file"
								hidden
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleChange(field as keyof BesoinTypeItem, file);
								}}
							/>
						</Button>
					</Grid>
				))}
			</Grid>
		</Stack>
	);
}
