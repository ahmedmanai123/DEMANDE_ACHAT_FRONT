import { useEffect, useState } from 'react';
import { Form, Input, Tabs, Button, Upload } from 'antd';
import { articleApi } from '@/api/articleApi';

interface Props { cbMarq: number; onBack: () => void; }

export default function ArticleForm({ cbMarq, onBack }: Props) {
  const [form] = Form.useForm();
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (cbMarq === 0) { form.resetFields(); return; }
    articleApi.getById(cbMarq).then((data) => form.setFieldsValue(data));
  }, [cbMarq]);

  const onFinish = async (values: Record<string, unknown>) => {
    const fd = new FormData();
    // Sérialise toutes les valeurs (comme [FromForm] F_ARTICLE côté C#)
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    if (photo) fd.append('photo', photo);
    await articleApi.save(fd);
    onBack();
  };

  const tabs = [
    {
      key: 'general', label: 'Général',
      children: (
        <>
          <Form.Item name="aR_Ref"    label="Référence"   rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="aR_Design" label="Désignation" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Photo">
            <Upload
              beforeUpload={(f) => { setPhoto(f); return false; }}
              maxCount={1}
              accept="image/*"
            >
              <Button>Choisir une image</Button>
            </Upload>
          </Form.Item>
        </>
      ),
    },
    {
      key: 'stock', label: 'Stock',
      children: (
        <Form.Item name="aR_SuiviStock" label="Suivi stock">
          <Input />
        </Form.Item>
      ),
    },
    {
      key: 'tarif', label: 'Tarif',
      children: (
        <>
          <Form.Item name="aR_PrixAch" label="Prix d'achat"><Input type="number" /></Form.Item>
          <Form.Item name="aR_PrixVen" label="Prix de vente"><Input type="number" /></Form.Item>
        </>
      ),
    },
  ];

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Button onClick={onBack} style={{ marginBottom: 12 }}>← Retour</Button>
      <Tabs items={tabs} />
      <Form.Item>
        <Button type="primary" htmlType="submit">Enregistrer</Button>
      </Form.Item>
    </Form>
  );
}