import { Box, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import familleService from "@/api/services/familleService";
import type { Catalogue } from "@/types/famille";

interface Props {
	onCatalogueSelect: (catalogue: Catalogue) => void;
	selectedCatalogue?: Catalogue;
}

export default function CatalogueSidebar({ onCatalogueSelect, selectedCatalogue }: Props) {
	const [catalogues, setCatalogues] = useState<Catalogue[]>([]);

	const fetchCatalogues = useCallback(async () => {
		try {
			const data = await familleService.getCatalogues(0, 1);
			setCatalogues(data);
		} catch (error) {
			console.error("Error fetching catalogues:", error);
		}
	}, []);

	useEffect(() => {
		fetchCatalogues();
	}, [fetchCatalogues]);

	const handleCatalogueClick = (catalogue: Catalogue) => {
		onCatalogueSelect(catalogue);
	};

	return (
		<Box sx={{ width: "100%", mt: 2 }}>
			<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
				Catalogues
			</Typography>
			<List sx={{ p: 0 }}>
				{catalogues &&
					catalogues.length > 0 &&
					catalogues.map((catalogue) => (
						<ListItem key={catalogue.Value} disablePadding>
							<ListItemButton
								selected={selectedCatalogue?.Value === catalogue.Value}
								onClick={() => handleCatalogueClick(catalogue)}
								sx={{
									"&.Mui-selected": {
										backgroundColor: "#154c79",
										color: "white",
										"&:hover": {
											backgroundColor: "#1a5f8f",
										},
									},
									"&:hover": {
										backgroundColor: "#f5f5f5",
									},
									borderRadius: 1,
									mb: 0.5,
								}}
							>
								<ListItemText
									primary={catalogue.Text}
									sx={{
										"& .MuiListItemText-primary": {
											fontSize: "0.875rem",
											fontWeight: catalogue.Value === 0 ? "bold" : "normal",
										},
									}}
								/>
								{catalogue.IsParent && <Box sx={{ ml: 1 }}>›</Box>}
							</ListItemButton>
						</ListItem>
					))}
			</List>
		</Box>
	);
}
