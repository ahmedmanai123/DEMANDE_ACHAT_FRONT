import { Checkbox, Form, Input, Modal, message, Select } from "antd";
import { useEffect } from "react";
import { useRoleStore } from "../../store/useRoleStore";

export default function RoleFormModal({
	open,
	onClose,
	role,
	onSubmit,
}: {
	open: boolean;
	onClose: () => void;
	role: any;
	onSubmit?: (roleData: any) => Promise<void>;
}) {
	const [form] = Form.useForm();
	const { createRole, updateRole, loading, getMaxCodeRole } = useRoleStore();

	useEffect(() => {
		if (open) {
			if (role) {
				form.setFieldsValue(role);
			} else {
				form.resetFields();
				// Get max code for new role
				getMaxCodeRole().then((code: any) => {
					if (code) {
						form.setFieldValue("RO_Code", code);
					}
				});
			}
		}
	}, [open, role, form, getMaxCodeRole]);

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();

			if (onSubmit) {
				await onSubmit(values);
			} else {
				const payload = role ? { ...role, ...values } : values;
				const success = role ? await updateRole(payload) : await createRole(payload);

				if (success) {
					message.success("Enregistrement réussi");
					onClose();
				}
			}
		} catch (e) {
			// validation error
		}
	};

	return (
		<Modal
			title={role ? "Modifier Rôle" : "Nouveau Rôle"}
			open={open}
			onCancel={onClose}
			onOk={handleSubmit}
			confirmLoading={loading}
		>
			<Form form={form} layout="vertical">
				<div className="grid grid-cols-2 gap-4">
					<Form.Item name="RO_Code" label="Code" rules={[{ required: true }]}>
						<Input disabled={!!role} />
					</Form.Item>
					<Form.Item name="RO_Intitule" label="Intitulé" rules={[{ required: true }]}>
						<Input />
					</Form.Item>
					<Form.Item name="RO_TypeRole" label="Type de rôle" rules={[{ required: true }]}>
						<Select>
							<Select.Option value={0}>Administrateur</Select.Option>
							<Select.Option value={1}>Acheteur</Select.Option>
							<Select.Option value={2}>Approbateur</Select.Option>
							<Select.Option value={3}>Demandeur</Select.Option>
							<Select.Option value={4}>Back-office</Select.Option>
						</Select>
					</Form.Item>
					<Form.Item name="RO_Archiver" valuePropName="checked" className="mt-8">
						<Checkbox>Archiver</Checkbox>
					</Form.Item>
				</div>
			</Form>
		</Modal>
	);
}
