import { Box, CircularProgress, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import familleService from "@/api/services/familleService";
import type { Catalogue } from "@/types/famille";

interface FilterLevel {
	level: number;
	catalogues: Catalogue[];
	selectedValue?: number;
}

interface Props {
	onFilterChange: (filters: { CL_No1?: number; CL_No2?: number; CL_No3?: number; CL_No4?: number }) => void;
	visible: boolean;
}

export default function CascadingCatalogueFilters({ onFilterChange, visible }: Props) {
	const [filterLevels, setFilterLevels] = useState<FilterLevel[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchSubCatalogues = useCallback(async (cl_NoParent: number) => {
		try {
			setLoading(true);
			const data = await familleService.getCatalogues(cl_NoParent, 1);
			return data;
		} catch (error) {
			console.error("Error fetching sub-catalogues:", error);
			return [];
		} finally {
			setLoading(false);
		}
	}, []);

	const handleCatalogueClick = useCallback(
		async (catalogue: Catalogue, level: number) => {
			if (!catalogue.IsParent) {
				// If it's not a parent, just update the filter
				const newFilters: any = {};
				newFilters[`CL_No${level}`] = catalogue.Value;

				// Clear deeper levels
				for (let i = level + 1; i <= 4; i++) {
					newFilters[`CL_No${i}`] = 0;
				}

				// Remove deeper filter levels
				setFilterLevels((prev) => prev.filter((f) => f.level <= level));

				onFilterChange(newFilters);
				return;
			}

			// If it's a parent, fetch sub-catalogues
			const subCatalogues = await fetchSubCatalogues(catalogue.Value);

			// Update the selected value for current level
			setFilterLevels((prev) => prev.map((f) => (f.level === level ? { ...f, selectedValue: catalogue.Value } : f)));

			// Add new level if sub-catalogues exist
			if (subCatalogues.length > 0) {
				const newLevel: FilterLevel = {
					level: level + 1,
					catalogues: subCatalogues,
					selectedValue: subCatalogues.find((c: Catalogue) => c.Text === "Tous")?.Value,
				};

				setFilterLevels((prev) => {
					// Remove deeper levels first
					const filtered = prev.filter((f) => f.level <= level);
					return [...filtered, newLevel];
				});

				// Update filters
				const newFilters: any = {};
				newFilters[`CL_No${level}`] = catalogue.Value;
				newFilters[`CL_No${level + 1}`] =
					subCatalogues.find((c: Catalogue) => c.Text === "Tous")?.Value || catalogue.Value;

				// Clear deeper levels
				for (let i = level + 2; i <= 4; i++) {
					newFilters[`CL_No${i}`] = 0;
				}

				onFilterChange(newFilters);
			}
		},
		[fetchSubCatalogues, onFilterChange],
	);

	const initializeFilters = useCallback(
		async (initialCatalogue: Catalogue) => {
			setFilterLevels([]);

			if (!initialCatalogue.IsParent) {
				onFilterChange({ CL_No1: initialCatalogue.Value });
				return;
			}

			const subCatalogues = await fetchSubCatalogues(initialCatalogue.Value);

			const firstLevel: FilterLevel = {
				level: 1,
				catalogues: subCatalogues,
				selectedValue: initialCatalogue.Value,
			};

			if (subCatalogues.length > 0) {
				const secondLevel: FilterLevel = {
					level: 2,
					catalogues: subCatalogues,
					selectedValue: subCatalogues.find((c: Catalogue) => c.Text === "Tous")?.Value,
				};

				setFilterLevels([firstLevel, secondLevel]);

				const filters = {
					CL_No1: initialCatalogue.Value,
					CL_No2: secondLevel.selectedValue || 0,
				};
				onFilterChange(filters);
			} else {
				setFilterLevels([firstLevel]);
				onFilterChange({ CL_No1: initialCatalogue.Value });
			}
		},
		[fetchSubCatalogues, onFilterChange],
	);

	const resetFilters = useCallback(() => {
		setFilterLevels([]);
		onFilterChange({
			CL_No1: 0,
			CL_No2: 0,
			CL_No3: 0,
			CL_No4: 0,
		});
	}, [onFilterChange]);

	// Expose methods through ref-like pattern
	useEffect(() => {
		// This will be used by parent component
		(window as any).cascadingFiltersRef = {
			initializeFilters,
			resetFilters,
		};
	}, [initializeFilters, resetFilters]);

	if (!visible) {
		return null;
	}

	return (
		<Box sx={{ width: "100%" }}>
			{loading && (
				<Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
					<CircularProgress size={20} />
				</Box>
			)}

			<Box sx={{ display: "flex", gap: 2, flexWrap: "nowrap", overflowX: "auto" }}>
				{filterLevels &&
					filterLevels.length > 0 &&
					filterLevels.map((filterLevel) => (
						<Box key={filterLevel.level} sx={{ minWidth: 200, flexShrink: 0 }}>
							<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
								Niveau {filterLevel.level}
							</Typography>
							<List sx={{ p: 0, border: "1px solid #ddd", borderRadius: 1, maxHeight: 200, overflowY: "auto" }}>
								{filterLevel.catalogues &&
									filterLevel.catalogues.length > 0 &&
									filterLevel.catalogues.map((catalogue) => (
										<ListItem key={catalogue.Value} disablePadding sx={{ p: 0 }}>
											<ListItemButton
												selected={filterLevel.selectedValue === catalogue.Value}
												onClick={() => handleCatalogueClick(catalogue, filterLevel.level)}
												sx={{
													"&.Mui-selected": {
														backgroundColor: "rgba(207, 226, 255, 0.5)",
														borderColor: "rgba(207, 226, 255, 1)",
													},
													"&:hover": {
														backgroundColor: "#f5f5f5",
													},
													py: 0.5,
												}}
											>
												<ListItemText
													primary={catalogue.Text}
													sx={{
														"& .MuiListItemText-primary": {
															fontSize: "0.875rem",
															fontWeight: catalogue.Text === "Tous" ? "bold" : "normal",
														},
													}}
												/>
												{catalogue.IsParent && <Box sx={{ ml: 1, fontSize: "0.875rem" }}>›</Box>}
											</ListItemButton>
										</ListItem>
									))}
							</List>
						</Box>
					))}
			</Box>
		</Box>
	);
}
