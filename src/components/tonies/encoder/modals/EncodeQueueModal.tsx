import React, { useEffect, useState } from "react";
import { Modal, List, Button, Space, Typography, Divider, message, Tag } from "antd";
import { useEncodeQueue, EncodeItemState } from "../hooks/useEncodeQueue";
import { PlayCircleOutlined, PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface Props {
    visible: boolean;
    onClose: () => void;
}

export const EncodeQueueModal: React.FC<Props> = ({ visible, onClose }) => {
    const { queues, fetchQueues, createQueue, addToQueue, startQueue, removeFromQueue, itemStates } = useEncodeQueue();
    const [selectedQueue, setSelectedQueue] = useState<string | null>(null);

    useEffect(() => {
        if (visible) fetchQueues();
    }, [visible, fetchQueues]);

    const handleCreate = async () => {
        const id = await createQueue("batch");
        if (id) {
            message.success("Queue created");
            setSelectedQueue(id);
        }
    };

    const handleStart = async () => {
        if (!selectedQueue) return message.warn("Select a queue first");
        const ok = await startQueue(selectedQueue);
        if (ok) message.success("Queue started");
        else message.error("Failed to start queue");
    };

    return (
        <Modal title="Encode Queue" open={visible} onCancel={onClose} footer={null} width={800}>
            <Space style={{ width: "100%" }} direction="vertical">
                <Space style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <Button icon={<PlusOutlined />} onClick={handleCreate} type="primary">
                            Create queue
                        </Button>
                    </div>
                    <div>
                        <Button onClick={handleStart} icon={<PlayCircleOutlined />} type="default" disabled={!selectedQueue}>
                            Start encoding
                        </Button>
                    </div>
                </Space>

                <Divider />

                <List
                    bordered
                    dataSource={queues}
                    renderItem={(q) => (
                        <List.Item
                            style={{ cursor: "pointer", background: selectedQueue === q.queueId ? '#eef' : undefined }}
                            onClick={() => setSelectedQueue(q.queueId)}
                            actions={[
                                <Button key="start" size="small" onClick={async (e) => { e.stopPropagation(); await startQueue(q.queueId); }}>
                                    Start
                                </Button>,
                                <Button key="del" danger size="small" icon={<DeleteOutlined />} onClick={async (e) => { e.stopPropagation(); await removeFromQueue(q.queueId); }} />,
                            ]}
                        >
                            <List.Item.Meta
                                title={<Space><Text strong>{q.name}</Text>{q.active && <Text type="success">(active)</Text>}</Space>}
                                description={`${q.items.length} item(s)`}
                            />
                        </List.Item>
                    )}
                />

                <Divider />

                {selectedQueue && (
                    <div>
                        <Text strong>Items in queue</Text>
                        <List
                            bordered
                            dataSource={queues.find((x) => x.queueId === selectedQueue)?.items || []}
                            renderItem={(item: string, index) => {
                                const st: EncodeItemState | undefined = itemStates?.[selectedQueue]?.[index];
                                const status = st?.status ?? "pending";
                                let color = "default";
                                if (status === "item-start") color = "blue";
                                else if (status === "item-complete") color = "green";
                                else if (status === "error") color = "red";

                                return (
                                    <List.Item actions={[
                                        <Button key="up" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} />,
                                        <Button key="down" size="small" icon={<ArrowDownOutlined />} disabled={false} />,
                                        <Button key="remove" size="small" danger icon={<DeleteOutlined />} onClick={async () => { await removeFromQueue(selectedQueue, index); }} />
                                    ]}>
                                        <List.Item.Meta
                                            title={<span>{item} {st?.error ? <div style={{ color: '#a00', fontSize: 12 }}>{st.error}</div> : null}</span>}
                                            description={<Tag color={color}>{status}</Tag>}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </div>
                )}
            </Space>
        </Modal>
    );
};

export default EncodeQueueModal;
