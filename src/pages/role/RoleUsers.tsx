import { useState, useEffect } from "react";
import { Button, Select, message } from "antd";
import { useRoleStore } from "../../store/useRoleStore";
import ProDataGrid from "../article/ProDataGrid";
import { roleService } from "../../api/services/roleService";
import apiClient from "../../api/apiClient";

export default function RoleUsers() {
  const { selectedRole } = useRoleStore();
  const [users, setUsers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (selectedRole) {
      fetchUsers(selectedRole.rO_No);
      fetchAvailableUsers(selectedRole.rO_No);
    } else {
      setUsers([]);
      setAvailableUsers([]);
    }
  }, [selectedRole]);

  const fetchUsers = async (roNo: number) => {
    setLoading(true);
    try {
      // Fallback API call assuming Account exists and accepts RO_No
      const res = await apiClient.get('/Account', { params: { RO_No: roNo } }).catch(() => ({ data: [] }));
      setUsers(res.data?.data || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async (roNo: number) => {
    try {
      const res = await roleService.getUsersTypeCompte(roNo);
      if (Array.isArray(res)) {
        setAvailableUsers(res.filter(u => u.value !== ""));
      }
    } catch (e) {}
  };

  const handleAddUser = async () => {
    if (!selectedRole || !selectedUserToAdd) return;
    try {
      setLoading(true);
      await roleService.addOrUpdateUsersRole(selectedRole.rO_No, selectedUserToAdd);
      message.success("Utilisateur ajouté");
      setSelectedUserToAdd(null);
      fetchUsers(selectedRole.rO_No);
    } catch (e: any) {
      message.error(e.response?.data?.RoleAlreadyAffected || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: "US_UserIntitule", headerName: "Nom d'affichage", width: 200 },
    { field: "UserName", headerName: "Nom d'utilisateur", width: 150 },
    { field: "Email", headerName: "Email", width: 200 },
  ];

  if (!selectedRole) {
    return <div className="text-center text-gray-400 mt-10">Sélectionnez un rôle dans la section Générale</div>;
  }

  return (
    <div>
      <div className="mb-4 flex gap-4 items-end">
        <div className="flex-1 max-w-sm">
          {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block mb-1 text-sm">Ajouter un utilisateur</label>
          <Select
            className="w-full"
            showSearch
            value={selectedUserToAdd}
            onChange={setSelectedUserToAdd}
            options={availableUsers.map(u => ({ label: u.text, value: u.value }))}
            allowClear
            placeholder="Sélectionner un utilisateur"
          />
        </div>
        <Button type="primary" onClick={handleAddUser} disabled={!selectedUserToAdd}>
          Ajouter
        </Button>
      </div>

      <ProDataGrid
        rows={users}
        columns={columns}
        loading={loading}
        rowCount={users.length}
        paginationModel={{ page: 0, pageSize: 10 }}
        onPaginationModelChange={() => {}}
        getRowId={(row) => row.Id || row.id || Math.random().toString()}
      />
    </div>
  );
}
