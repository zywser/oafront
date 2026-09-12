import http from "./http";
import { useAuthStore } from "@/stores/auth";

const cleanParams = (params = {}) => {
  const result = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  });
  return result;
};

const getConfig = () => {
  return http.get("/agent/config");
};

const getStats = () => {
  return http.get("/agent/stats");
};

const ask = (data) => {
  return http.post("/agent/ask", data);
};

// 真正的 SSE 流式请求：不走 axios（axios/XHR 必须等整个响应结束才能拿到数据，
// 无法逐字展示，且受全局 timeout 限制），改用 fetch + ReadableStream 边收边解析。
// 事件回调：onStart / onDelta / onUsage / onDone / onError，每个回调收到事件 dict。
const askStream = (data, handlers = {}) => {
  const authStore = useAuthStore();
  const baseURL = import.meta.env.VITE_BASE_URL || "";
  const headers = { "Content-Type": "application/json" };
  if (authStore.token) {
    headers.Authorization = "JWT " + authStore.token;
  }

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    // 90s 兜底超时（联网问答一般 20~40s），防止服务端异常时前端无限等待
    const timer = setTimeout(() => controller.abort(), 90000);

    fetch(`${baseURL}/agent/ask/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let detail = "网络错误";
          try {
            const body = await response.json();
            if (body?.detail) {
              detail = body.detail;
            }
          } catch (e) {
            /* 非 JSON 响应体 */
          }
          reject(detail);
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let settled = false;
        const settle = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            settle();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            let event;
            try {
              event = JSON.parse(part.slice(6).trim());
            } catch (e) {
              continue;
            }
            if (event.type === "start") {
              handlers.onStart?.(event);
            } else if (event.type === "delta") {
              handlers.onDelta?.(event);
            } else if (event.type === "usage") {
              handlers.onUsage?.(event);
            } else if (event.type === "done") {
              handlers.onDone?.(event);
              settle();
            } else if (event.type === "error") {
              handlers.onError?.(event);
              settle();
            }
          }
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        reject("网络错误");
      });
  });
};

const getSources = (params = {}) => {
  return http.get("/agent/sources", cleanParams(params));
};

const deleteSource = (id) => {
  return http.delete(`/agent/sources/${id}`);
};

const uploadSource = ({ title, content, file, is_public, department_ids, metadata }) => {
  const formData = new FormData();
  formData.append("title", title || "");
  formData.append("content", content || "");
  formData.append("is_public", is_public ? "true" : "false");
  formData.append("metadata", JSON.stringify(metadata || {}));

  if (file) {
    formData.append("file", file);
  }

  if (Array.isArray(department_ids)) {
    department_ids.forEach((id) => formData.append("department_ids", id));
  }

  return http.post("/agent/upload", formData);
};

const syncInforms = () => {
  return http.post("/agent/sync/informs", {});
};

const reindexSources = (source_ids = [], failedOnly = false) => {
  return http.post("/agent/reindex", { source_ids, failed_only: failedOnly });
};

const batchDeleteSources = (source_ids = []) => {
  return http.post("/agent/sources/batch-delete", { source_ids });
};

const createFeedback = (data) => {
  return http.post("/agent/feedback", data);
};

const getConversations = (params = {}) => {
  return http.get("/agent/conversations", cleanParams(params));
};

const getConversation = (id) => {
  return http.get(`/agent/conversations/${id}`);
};

const deleteConversation = (id) => {
  return http.delete(`/agent/conversations/${id}`);
};

export default {
  getConfig,
  getStats,
  ask,
  askStream,
  getSources,
  deleteSource,
  uploadSource,
  syncInforms,
  reindexSources,
  batchDeleteSources,
  createFeedback,
  getConversations,
  getConversation,
  deleteConversation,
};
