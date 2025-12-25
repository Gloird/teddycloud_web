import { useState, useCallback, useEffect, useRef } from "react";
import { message } from "antd";
import { TeddyCloudApi } from "../../../../api";
import { defaultAPIConfig } from "../../../../config/defaultApiConfig";

const api = new TeddyCloudApi(defaultAPIConfig());

export interface EncodeQueueItem {
    queueId: string;
    name: string;
    items: string[];
    active: boolean;
}

export type EncodeItemStatus = "pending" | "item-start" | "item-complete" | "error";

export interface EncodeItemState {
    status: EncodeItemStatus;
    file?: string;
    error?: string;
}

export const useEncodeQueue = () => {
    const [queues, setQueues] = useState<EncodeQueueItem[]>([]);
    const [itemStates, setItemStates] = useState<Record<string, Record<number, EncodeItemState>>>({});

    const fetchQueues = useCallback(async () => {
        try {
            const res = await api.apiGetTeddyCloudApiRaw(`/api/encodeQueue/list`);
            const data = await res.json();
            if (data && data.queues) {
                setQueues(data.queues.map((q: any) => ({ queueId: q.queueId, name: q.name, items: q.items, active: q.active })));
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchQueues();
    }, [fetchQueues]);

    // SSE for encode queue progress
    const eventSourceRef = useRef<EventSource | null>(null);
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_APP_TEDDYCLOUD_API_URL || "";
        const es = new EventSource(`${apiUrl}/api/sse`);
        eventSourceRef.current = es;

        const handler = (ev: MessageEvent) => {
            try {
                // follow existing parsing pattern in other hooks
                const parsedOuter = JSON.parse(ev.data);
                const data = parsedOuter.data ? parsedOuter.data : null;
                const payload = typeof data === "string" ? JSON.parse(data) : data;
                if (payload && payload.queueId) {
                    const qid = payload.queueId as string;
                    // handle item-level updates
                    if (typeof payload.index !== "undefined") {
                        const idx = Number(payload.index);
                        const status = payload.status as string;
                        const file = payload.file as string | undefined;
                        const err = payload.error as string | undefined;

                        setItemStates((prev) => {
                            const next = { ...prev };
                            if (!next[qid]) next[qid] = {};
                            next[qid] = { ...next[qid], [idx]: { status: status as any, file, error: err } };
                            return next;
                        });

                        // notifications
                        if (status === "item-start") {
                            message.info(`Encode queue ${qid}: item ${idx} started`);
                        } else if (status === "item-complete") {
                            message.success(`Encode queue ${qid}: item ${idx} complete`);
                        } else if (status === "error") {
                            message.error(`Encode queue ${qid}: item ${idx} error: ${err}`);
                        }
                    } else {
                        // non-item event — refresh queues
                        fetchQueues();
                    }
                }
            } catch (e) {
                // ignore parse errors
                // console.error('Failed to parse SSE', e);
            }
        };

        es.addEventListener("encode-queue-progress", handler as EventListener);
        es.onerror = () => {
            // try reconnect automatically (EventSource does it), but refetch queues occasionally
            setTimeout(() => fetchQueues(), 3000);
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [fetchQueues]);

    const createQueue = useCallback(async (name = "batch") => {
        const res = await api.apiPostTeddyCloudRaw(`/api/encodeQueue/create`, `name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data && data.queueId) {
            await fetchQueues();
            return data.queueId;
        }
        return null;
    }, [fetchQueues]);

    const addToQueue = useCallback(async (queueId: string, filePath: string) => {
        const res = await api.apiPostTeddyCloudRaw(`/api/encodeQueue/add`, `queueId=${encodeURIComponent(queueId)}&filePath=${encodeURIComponent(filePath)}`);
        const data = await res.json();
        if (data && data.success) {
            await fetchQueues();
            return true;
        }
        return false;
    }, [fetchQueues]);

    const startQueue = useCallback(async (queueId: string) => {
        const res = await api.apiPostTeddyCloudRaw(`/api/encodeQueue/start`, `queueId=${encodeURIComponent(queueId)}`);
        const data = await res.json();
        return data && data.success;
    }, []);

    const removeFromQueue = useCallback(async (queueId: string, index?: number) => {
        let body = `queueId=${encodeURIComponent(queueId)}`;
        if (typeof index === 'number') body += `&index=${index}`;
        const res = await api.apiPostTeddyCloudRaw(`/api/encodeQueue/remove`, body);
        const data = await res.json();
        if (data && data.success) await fetchQueues();
        return data && data.success;
    }, [fetchQueues]);

    return {
        queues,
        itemStates,
        fetchQueues,
        createQueue,
        addToQueue,
        startQueue,
        removeFromQueue,
    };
};
