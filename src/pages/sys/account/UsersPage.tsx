import { Add, Delete, Edit, Lock, LockOpen, Refresh } from "@mui/icons-material";
import { Box, Button, Chip, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router";
import { accountService } from "@/services/accountService";
import { type SelectOption, TypeCompte, type UserDto } from "@/types/account";

const TYPE_COMPTE_FILTER = [
	{ value: -1, label: "Tous" },
	{ value: TypeCompte.Administrateur, label: "Administrateur" },
	{ value: TypeCompte.Approbateur, label: "Approbateur" },
	{ value: TypeCompte.Back_office, label: "Back office" },
	{ value: TypeCompte.Demandeur, label: "Demandeur" },
	{ value: TypeCompte.Acheteur, label: "Acheteur" },
];

export default function UsersPage() {
	const navigate = useNavigate();
	const [users, setUsers] = useState<UserDto[]>([]);
	const [loading, setLoading] = useState(false);
	const [totalUsers, setTotalUsers] = useState(0);
	const [paginationModel, setPaginationModel] = useState({
		page: 0,
		pageSize: 10,
	});
	const [filterTypeCompte, setFilterTypeCompte] = useState<number>(-1);
	const [roles, setRoles] = useState<SelectOption[]>([]);
	const [filterRole, setFilterRole] = useState<number>(0);

	const loadUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await accountService.getUsers({
				pageIndex: paginationModel.page + 1,
				pageSize: paginationModel.pageSize,
				us_TypeCompte: filterTypeCompte as any,
				ro_No: filterRole || undefined,
			});
			setUsers(response.data || []);
			// Handle both 'total' and 'itemsCount' from backend
			setTotalUsers(response.total ?? response.itemsCount ?? 0);
		} catch (error) {
			toast.error("Erreur chargement des utilisateurs");
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [paginationModel, filterTypeCompte, filterRole]);

	const loadRoles = useCallback(async () => {
		try {
			const rolesData = await accountService.getRoles();
			const mappedRoles: SelectOption[] = rolesData.map((role) => ({
				text: role.ro_Intitule,
				value: role.ro_No,
			}));
			setRoles([{ text: "Tous", value: 0 }, ...mappedRoles]);
		} catch (error) {
			console.error("Error loading roles:", error);
		}
	}, []);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	useEffect(() => {
		loadRoles();
	}, [loadRoles]);

	const handleDelete = async (id: string) => {
		if (!window.confirm("Voulez-vous supprimer cet utilisateur ?")) return;

		try {
			// Note: You'll need to add a delete endpoint in backend
			toast.success("Utilisateur supprimé");
			loadUsers();
		} catch (error) {
			toast.error("Erreur suppression");
		}
	};

	const handleBlockUser = async (id: string, isLocked: boolean) => {
		try {
			if (isLocked) {
				await accountService.unblockUser(id);
				toast.success("Utilisateur débloqué");
			} else {
				// For blocking, you might want to ask for a date
				const oneYearFromNow = new Date();
				oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
				await accountService.blockUser(id, oneYearFromNow.toISOString());
				toast.success("Utilisateur bloqué");
			}
			loadUsers();
		} catch (error) {
			toast.error("Erreur opération");
		}
	};

	const columns: GridColDef[] = [
		{
			field: "us_UserIntitule",
			headerName: "Nom d'affichage",
			width: 200,
			renderCell: (params) => (
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					{params.row.picture && (
						<img
							src={params.row.picture}
							alt=""
							style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
						/>
					)}
					<Typography
						variant="body2"
						sx={{ color: "#e2552d", cursor: "pointer", textDecoration: "underline" }}
						onClick={() => navigate(`/account/users/edit/${params.row.id}`)}
					>
						{params.value}
					</Typography>
				</Box>
			),
		},
		{
			field: "userName",
			headerName: "Nom d'utilisateur",
			width: 150,
		},
		{
			field: "email",
			headerName: "Email",
			width: 210,
		},
		{
			field: "ro_No",
			headerName: "Rôle",
			width: 120,
			renderCell: (params) => {
				const role = roles.find((r) => r.value === params.value);
				return role?.text || "-";
			},
		},
		{
			field: "lockoutEnd",
			headerName: "Date déblocage",
			width: 120,
			renderCell: (params) => {
				if (params.value && params.row.lockoutEnabled) {
					return new Date(params.value).toLocaleDateString();
				}
				return "-";
			},
		},
		{
			field: "lockoutEnabled",
			headerName: "État",
			width: 80,
			align: "center",
			headerAlign: "center",
			renderCell: (params) => {
				const isLocked = params.value && params.row.lockoutEnd && new Date() < new Date(params.row.lockoutEnd);
				return isLocked ? <Lock fontSize="small" color="error" /> : <LockOpen fontSize="small" color="success" />;
			},
		},
		{
			field: "actions",
			headerName: "Actions",
			width: 200,
			sortable: false,
			renderCell: (params) => (
				<Box sx={{ display: "flex", gap: 0.5 }}>
					<Tooltip title="Modifier">
						<IconButton size="small" color="primary" onClick={() => navigate(`/account/users/edit/${params.row.id}`)}>
							<Edit fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title={params.row.lockoutEnabled ? "Débloquer" : "Bloquer"}>
						<IconButton
							size="small"
							color={params.row.lockoutEnabled ? "success" : "warning"}
							onClick={() => handleBlockUser(params.row.id, params.row.lockoutEnabled)}
						>
							{params.row.lockoutEnabled ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
						</IconButton>
					</Tooltip>
					<Tooltip title="Supprimer">
						<IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
							<Delete fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
	];

	return (
		<Box sx={{ p: 3 }}>
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
				<Typography variant="h5">Gestion des utilisateurs</Typography>
				<Button variant="contained" color="primary" startIcon={<Add />} onClick={() => navigate("/account/users/new")}>
					Nouveau
				</Button>
			</Box>

			<Box sx={{ mb: 2, display: "flex", gap: 2 }}>
				<TextField
					select
					label="Type de compte"
					value={filterTypeCompte}
					onChange={(e) => setFilterTypeCompte(Number(e.target.value))}
					size="small"
					sx={{ minWidth: 200 }}
				>
					{TYPE_COMPTE_FILTER.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							{option.label}
						</MenuItem>
					))}
				</TextField>

				<TextField
					select
					label="Rôle"
					value={filterRole}
					onChange={(e) => setFilterRole(Number(e.target.value))}
					size="small"
					sx={{ minWidth: 200 }}
				>
					{roles.map((role) => (
						<MenuItem key={role.value} value={role.value}>
							{role.text}
						</MenuItem>
					))}
				</TextField>

				<Button variant="outlined" startIcon={<Refresh />} onClick={loadUsers}>
					Actualiser
				</Button>
			</Box>

			<DataGrid
				rows={users}
				columns={columns}
				getRowId={(row) => row.id || ""}
				loading={loading}
				pagination
				paginationMode="server"
				rowCount={totalUsers}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				pageSizeOptions={[10, 20, 50, 100]}
				sx={{
					bgcolor: "background.paper",
					"& .MuiDataGrid-cell": {
						py: 1,
					},
				}}
			/>
		</Box>
	);
}
