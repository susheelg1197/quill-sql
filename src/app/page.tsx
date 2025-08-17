'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Input,
  Layout,
  List,
  Row,
  Space,
  Table,
  Typography,
  Tooltip,
} from 'antd';
import { CopyOutlined, PlayCircleFilled } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

type RowT = Record<string, any>;
type ChatMsg = { role: 'user' | 'assistant'; content: string };
type SchemaResp = { columns: { table: string; name: string; dataType: string; isNullable?: boolean }[] };

// ---------- helpers ----------
function extractSqlBlocks(markdown: string): string[] {
  const re = /```sql\s*\n([\s\S]*?)```/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) out.push(m[1].trim());
  return out;
}

function UserBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'inline-block',
        background: '#1677ff',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: 10,
        maxWidth: '80%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'inline-block',
        background: 'rgba(0,0,0,0.04)',
        padding: '8px 12px',
        borderRadius: 10,
        maxWidth: '80%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <Text>{text}</Text>
    </div>
  );
}

function AssistantSqlCard({ sql, onRun }: { sql: string; onRun: (s: string) => void }) {
  return (
    <Card
      size="small"
      title="SQL"
      extra={
        <Space>
          <Tooltip title="Run the SQL">
            <Button size="small" type="primary" icon={<PlayCircleFilled />} onClick={() => onRun(sql)} />
          </Tooltip>
          <Tooltip title="Copy SQL">
            <Button size="small" icon={<CopyOutlined />} onClick={() => navigator.clipboard.writeText(sql)} />
          </Tooltip>
        </Space>
      }
      style={{ maxWidth: '100%' }}
    >
      <pre
        style={{
          background: '#fafafa',
          border: '1px solid #eee',
          padding: 12,
          borderRadius: 8,
          overflowX: 'auto',
          margin: 0,
        }}
      >
        {sql}
      </pre>
    </Card>
  );
}

// ---------- page ----------
export default function Home() {
  const { message } = AntApp.useApp();
  const [sql, setSql] = useState<string>(`SELECT *\nFROM customers\nORDER BY created_at DESC\nLIMIT 10;`);
  const [fields, setFields] = useState<string[]>([]);
  const [rows, setRows] = useState<RowT[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [prompt, setPrompt] = useState<string>('get all products');
  const [loadingChat, setLoadingChat] = useState(false);

  const [schema, setSchema] = useState<SchemaResp | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (fetchingRef.current || schema) return;
      fetchingRef.current = true;
      try {
        const res = await fetch('/api/schema', { cache: 'no-store' });
        if (res.ok) {
          const j = (await res.json()) as SchemaResp;
          setSchema(j);
        } else {
          // non-blocking: show a soft warning but keep UI usable
          const txt = await res.text();
          console.warn('Schema preload failed:', res.status, txt);
        }
      } finally {
        fetchingRef.current = false;
      }
    })();
  }, [schema]);

  async function ensureSchema(): Promise<SchemaResp | null> {
    if (schema) return schema;
    try {
      const res = await fetch('/api/schema', { cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text();
        message.error(`Schema fetch failed (${res.status})`);
        console.error('schema error:', txt);
        return null;
      }
      const j = (await res.json()) as SchemaResp;
      setSchema(j);
      return j;
    } catch (e) {
      message.error('Schema fetch failed');
      return null;
    }
  }

  async function runQuery(nextSql?: string) {
    const body = { sql: nextSql ?? sql };
    const res = await fetch('/api/sql/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (j.error) {
      message.error(j.error);
      return;
    }
    setFields(j.fields);
    setRows(j.rows);
    if (nextSql) setSql(nextSql);
  }

  async function sendChat() {
  setLoadingChat(true);
  try {
    const s = await ensureSchema();
    if (!s) {
      setChat(c => [...c, { role: "user", content: prompt }, { role: "assistant", content: "⚠️ Could not load schema." }]);
      setPrompt(""); return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, schema: s }),
    });

    const j = await res.json();
    const aiText: string = j.content ?? "";

    // Validate first SQL block (if any)
    const blocks = extractSqlBlocks(aiText);
    if (blocks.length > 0) {
      const v = await fetch("/api/sql/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: blocks[0] }),
      }).then(r => r.json());

      if (!v.ok) {
        const msg = `⚠️ The generated SQL is invalid: ${v.error}`;
        setChat(c => [...c, { role: "user", content: prompt }, { role: "assistant", content: msg }]);
        setPrompt("");
        return;
      }
    }

    setChat(c => [...c, { role: "user", content: prompt }, { role: "assistant", content: aiText }]);
    setPrompt("");
  } finally {
    setLoadingChat(false);
  }
}

  const tableColumns = useMemo(
    () => fields.map((f) => ({ title: f, dataIndex: f, key: f })),
    [fields]
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ background: '#f5f5f5', padding: '14px 20px' }}>
        <Title level={4} style={{ margin: 0, color: '#111' }}>Quill SQL</Title>
      </Header>

      <Content style={{ padding: 20 }}>
        <Row gutter={16} align="top">
          {/* Left: Editor + Results */}
          <Col xs={24} lg={14} xl={16}>
            <Card title="SQL Editor" styles={{ body: { padding: 0 } }}>
              <div style={{ position: 'relative', padding: 16 }}>
                <div style={{ height: '46vh', border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={sql}
                    onChange={(v) => setSql(v || '')}
                    theme="light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                </div>
                <div style={{ position: 'absolute', right: 24, bottom: 24 }}>
                  <Button type="primary" icon={<PlayCircleFilled />} onClick={() => runQuery()}>
                    Run query
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Results" style={{ marginTop: 16 }}>
              {fields.length === 0 ? (
                <Text type="secondary">No results yet. Click <b>Run query</b> above.</Text>
              ) : (
                <Table
                  size="small"
                  columns={tableColumns}
                  dataSource={rows.map((r, i) => ({ key: i, ...r }))}
                  pagination={{ pageSize: 12 }}
                  scroll={{ x: true, y: 360 }}
                />
              )}
            </Card>
          </Col>

          {/* Right: Chat */}
          <Col xs={24} lg={10} xl={8}>
            <Card title="AI Chat" styles={{ body: { display: 'flex', flexDirection: 'column', height: '70vh' } }}>
              <List
                style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}
                dataSource={chat}
                renderItem={(m) => {
                  if (m.role === 'user') {
                    return (
                      <List.Item style={{ display: 'block', border: 0, padding: '8px 0' }}>
                        <div style={{ textAlign: 'right' }}>
                          <UserBubble text={m.content} />
                        </div>
                      </List.Item>
                    );
                  }

                  // Assistant message
                  const blocks = extractSqlBlocks(m.content);

                  if (blocks.length > 0) {
                    return (
                      <List.Item style={{ display: 'block', border: 0, padding: '8px 0' }}>
                        <AssistantSqlCard sql={blocks[0]} onRun={runQuery} />
                      </List.Item>
                    );
                  }

                  return (
                    <List.Item style={{ display: 'block', border: 0, padding: '8px 0' }}>
                      <AssistantBubble text={m.content} />
                    </List.Item>
                  );
                }}
              />

              <Space.Compact style={{ marginTop: 12 }}>
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask a follow up question…"
                  onPressEnter={sendChat}
                  disabled={loadingChat}
                  style={{ width: '100%' }}
                />
                <Button type="primary" onClick={sendChat} loading={loadingChat}>
                  Send
                </Button>
              </Space.Compact>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}