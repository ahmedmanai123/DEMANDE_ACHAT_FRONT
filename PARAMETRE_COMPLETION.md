# ParamètrePage - Sections manquantes à ajouter

Les sections suivantes doivent être ajoutées au fichier `ParametrePage.tsx`:

## 1. Logo & Fond d'écran (Tab 0)
```typescript
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
              <Box sx={{ width: 120, height: 120, mb: 2, bgcolor: "grey.200", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon sx={{ fontSize: 40, color: "grey.500" }} />
              </Box>
            )}
            <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => document.getElementById("logo-upload")?.click()}>
              Choisir un logo
            </Button>
            <input id="logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) setLogoFile(file); }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Fond d'écran de connexion
            </Typography>
            {bgPreview ? (
              <Box sx={{ mb: 2 }}>
                <img src={bgPreview} alt="Background" style={{ width: "100%", maxWidth: 300, height: 120, objectFit: "cover", borderRadius: 8 }} />
              </Box>
            ) : (
              <Box sx={{ width: "100%", maxWidth: 300, height: 120, mb: 2, bgcolor: "grey.200", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                <ImageIcon sx={{ fontSize: 40, color: "grey.500" }} />
              </Box>
            )}
            <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => document.getElementById("bg-upload")?.click()}>
              Choisir un fond
            </Button>
            <input id="bg-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) setBgFile(file); }} />
          </Grid>
        </Grid>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleSaveParametreWithFiles} disabled={isSaving} startIcon={<SaveIcon />}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </Box>
      </Stack>
    </CardContent>
  </Card>
)}
```

## 2. Dépôts Autorisés (Tab 1)
```typescript
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
      getRowId={(row) => row.dA_No}
      density="compact"
      sx={{ minHeight: 300 }}
    />
  </Stack>
)}
```

## 3. Affaires Autorisées (Tab 2)
```typescript
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
      density="compact"
      sx={{ minHeight: 300 }}
    />
  </Stack>
)}
```

## 4. Catégories Autorisées (Tab 3)
```typescript
{tabValue === 3 && (
  <Stack spacing={3}>
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Sélectionner les catalogues
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField select label="Catalogue 1" value={selectedCL1} onChange={(e) => handleCL1Change(Number(e.target.value))} fullWidth size="small">
              <MenuItem value={0}>Choisir</MenuItem>
              {cataloguesN1.map((c) => (<MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField select label="Catalogue 2" value={selectedCL2} onChange={(e) => handleCL2Change(Number(e.target.value))} fullWidth size="small" disabled={selectedCL1 === 0}>
              <MenuItem value={0}>Choisir</MenuItem>
              {cataloguesN2.map((c) => (<MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField select label="Catalogue 3" value={selectedCL3} onChange={(e) => handleCL3Change(Number(e.target.value))} fullWidth size="small" disabled={selectedCL2 === 0}>
              <MenuItem value={0}>Choisir</MenuItem>
              {cataloguesN3.map((c) => (<MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField select label="Catalogue 4" value={selectedCL4} onChange={(e) => handleCL4Change(Number(e.target.value))} fullWidth size="small" disabled={selectedCL3 === 0}>
              <MenuItem value={0}>Choisir</MenuItem>
              {cataloguesN4.map((c) => (<MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>))}
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
      density="compact"
      sx={{ minHeight: 300 }}
    />
  </Stack>
)}
```

## 5. Modifier les numéros de tab existants

Changer:
- E-Mail: `tabValue === 0` → `tabValue === 4`
- Comptabilisation: `tabValue === 1` → `tabValue === 5`
- Rectification Motif: `tabValue === 2` → `tabValue === 6`
- Autre: `tabValue === 3` → `tabValue === 7`

## 6. Ajouter les Dialogs pour Dépôts et Affaires (en bas du composant, avant la fermeture de la balise Box principale)

Ces dialogs permettent de sélectionner plusieurs dépôts/affaires à ajouter.

**Note**: Le fichier actuel contient déjà toute la logique (handlers, state, etc.), il suffit d'ajouter les sections UI ci-dessus aux bons endroits.
