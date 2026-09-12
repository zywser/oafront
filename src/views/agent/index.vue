<script setup name="agent">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ChatDotRound,
  CirclePlus,
  Delete,
  Document,
  Files,
  Refresh,
  RefreshRight,
  Search,
  UploadFilled,
} from "@element-plus/icons-vue";

import OAmain from "@/components/OAmain.vue";
import OAPagination from "@/components/OAPagination.vue";
import agentHttp from "@/api/agentHttp";
import staffHttp from "@/api/staffHttp";
import timeFormatter from "@/utils/timeFormatter";

const config = ref({});
const stats = ref({});
const departments = ref([]);
const sources = ref([]);
const conversations = ref([]);
const messages = ref([]);
const activeConversation = ref(null);
const selectedSourceIds = ref([]);
const selectedSourceRows = ref([]);
const question = ref("");
const uploadVisible = ref(false);
const citationDialogVisible = ref(false);
const activeCitationMessage = ref(null);
const uploadFormRef = ref();
const uploadFileRef = ref();
const chatBodyRef = ref();

const loading = reactive({
  init: false,
  sources: false,
  conversations: false,
  asking: false,
  uploading: false,
  syncing: false,
  reindexing: false,
  deleting: false,
});

const sourcePagination = reactive({
  page: 1,
  total: 0,
});

const conversationPagination = reactive({
  page: 1,
  total: 0,
});

const sourceFilters = reactive({
  search: "",
  source_type: "",
  status: "",
});

const uploadForm = reactive({
  title: "",
  content: "",
  file: null,
  is_public: true,
  department_ids: [],
});

const topK = ref(5);
const webSearchEnabled = ref(true);

const uploadRules = {
  title: [{ required: true, message: "请输入知识标题", trigger: "blur" }],
};

const sourceTypeMap = {
  inform: "通知",
  upload: "上传",
  manual: "手动",
  faq: "FAQ",
};

const statusMap = {
  pending: { text: "待索引", type: "warning" },
  indexed: { text: "已索引", type: "success" },
  failed: { text: "失败", type: "danger" },
};

const currentModel = computed(() => {
  const llm = config.value?.llm || {};
  return [llm.provider, llm.model].filter(Boolean).join(" / ") || "未配置";
});

const sourceOptions = computed(() => {
  return sources.value
    .filter((item) => item.status === "indexed")
    .map((item) => ({ label: item.title, value: item.id }));
});

const allSourceSelected = computed(() => {
  return sourceOptions.value.length > 0 && selectedSourceIds.value.length === sourceOptions.value.length;
});

const sourceSelectionIndeterminate = computed(() => {
  return selectedSourceIds.value.length > 0 && !allSourceSelected.value;
});

const activeCitations = computed(() => {
  return activeCitationMessage.value?.citations || [];
});

// 引用按相关度降序展示，只保留最相关的 N 条，避免全部堆出造成混乱
const MAX_VISIBLE_CITATIONS = 5;

const sortCitations = (citations) => {
  return [...(citations || [])].sort((a, b) => {
    const scoreA = Number(a?.score) || 0;
    const scoreB = Number(b?.score) || 0;
    return scoreB - scoreA;
  });
};

const sortedCitations = computed(() => sortCitations(activeCitations.value));

const visibleCitations = computed(() => {
  return sortedCitations.value.slice(0, MAX_VISIBLE_CITATIONS);
});

const normalizedList = (data) => {
  if (Array.isArray(data)) {
    return { rows: data, total: data.length };
  }
  return {
    rows: data?.results || [],
    total: data?.count || 0,
  };
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  return timeFormatter.stringFromDateTime(value);
};

const sourceTypeText = (value, label) => {
  return sourceTypeMap[value] || label || value || "-";
};

const statusText = (value, label) => {
  return statusMap[value]?.text || label || value || "-";
};

const statusType = (value) => {
  return statusMap[value]?.type || "info";
};

const stripHtml = (value) => {
  if (!value) {
    return "-";
  }

  const html = String(value);
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").trim() || "-";
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.innerText || container.textContent || "").trim() || "-";
};

const formatCitationExcerpt = (value) => {
  return stripHtml(value);
};

// 安全转义后把 **标题** 渲染为 <h3>，行内 **粗体** 渲染为 <strong>
const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const renderMarkdown = (text) => {
  if (!text) return "";
  let html = escapeHtml(text);
  // 行首（可带列表符号 - *）的 **标题** → <h3>
  html = html.replace(/^\s*[-*]\s*\*\*(.+?)\*\*/gm, "<h3>$1</h3>");
  // 行首 **标题**（后接内容或独立成行）→ <h3>
  html = html.replace(/^\*\*(.+?)\*\*/gm, "<h3>$1</h3>");
  // 行内 **粗体** → <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return html;
};

// 联网搜索来源且带真实链接 → 渲染为可点击超链接
const isWebLink = (source) => source?.source_type === "web" && !!source?.url;

// 渲染回答：markdown + 引用编号角标。编号超出引用总数的视为“对不上”，标灰。
const renderAnswerContent = (content, citations = []) => {
  if (!content) return "";
  const validCount = Array.isArray(citations) ? citations.length : 0;
  let html = renderMarkdown(content);
  const makeRef = (n) => {
    const valid = Number.isFinite(n) && n >= 1 && n <= validCount;
    const cls = valid ? "el-tag--primary" : "el-tag--info";
    return `<span class="citation-ref el-tag el-tag--small is-round ${cls}" data-ref="${n}">${n}</span>`;
  };
  // [n] 紧跟句读标点（如 “字[1]。”）→ 角标移到标点后：字。[1]，避免角标贴着句子
  html = html.replace(/((?:\[\d+\])+)\s*([。！？；：，、．….!?;:,])/g, (m, refs, punct) => {
    const refsHtml = (refs.match(/\[(\d+)\]/g) || []).map((r) => makeRef(parseInt(r.slice(1, -1), 10))).join("");
    return punct + refsHtml;
  });
  // 其余引用编号原位转角标
  html = html.replace(/\[(\d+)\]/g, (m, num) => makeRef(parseInt(num, 10)));
  return html;
};

// 点击消息内容中的有效引用角标 → 打开引用证据弹窗
const onMessageContentClick = (event, message) => {
  const ref = event.target.closest(".citation-ref.el-tag--primary");
  if (ref && message?.citations?.length) {
    openCitationDialog(message);
  }
};

const citationIndexText = (index) => {
  return String(index + 1).padStart(2, "0");
};

const citationSourceLabel = (source) => {
  return sourceTypeText(source?.source_type, source?.source_type_label);
};

const citationTypeType = (source) => {
  const map = { inform: "inform", upload: "upload", manual: "manual", web: "web", faq: "faq" };
  return map[source?.source_type] || "other";
};

const citationScoreText = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return "";
  }
  return num.toFixed(3);
};

const citationMetaText = (source) => {
  const parts = [];
  const sourceLabel = citationSourceLabel(source);
  if (sourceLabel && sourceLabel !== "-") {
    parts.push(sourceLabel);
  }
  if (source?.source_id !== undefined && source?.source_id !== null && source?.source_id !== "") {
    parts.push(`来源 #${source.source_id}`);
  }
  if (source?.chunk_id !== undefined && source?.chunk_id !== null && source?.chunk_id !== "") {
    parts.push(`片段 #${source.chunk_id}`);
  }
  return parts;
};

const openCitationDialog = (message) => {
  activeCitationMessage.value = message;
  citationDialogVisible.value = true;
};

const toggleSourceSelection = (checked) => {
  selectedSourceIds.value = checked ? sourceOptions.value.map((item) => item.value) : [];
};

const visibilityText = (row) => {
  if (row.is_public) {
    return "公开";
  }
  return row.department_names?.length ? row.department_names.join("、") : "指定部门";
};

const loadConfig = async () => {
  config.value = await agentHttp.getConfig();
  topK.value = config.value?.top_k || 5;
};

const loadStats = async () => {
  stats.value = await agentHttp.getStats();
};

const loadSources = async () => {
  loading.sources = true;
  try {
    const data = await agentHttp.getSources({
      page: sourcePagination.page,
      search: sourceFilters.search,
      source_type: sourceFilters.source_type,
      status: sourceFilters.status,
    });
    const normalized = normalizedList(data);
    sources.value = normalized.rows;
    sourcePagination.total = normalized.total;
  } finally {
    loading.sources = false;
  }
};

const loadConversations = async () => {
  loading.conversations = true;
  try {
    const data = await agentHttp.getConversations({ page: conversationPagination.page });
    const normalized = normalizedList(data);
    conversations.value = normalized.rows;
    conversationPagination.total = normalized.total;
  } finally {
    loading.conversations = false;
  }
};

const loadDepartments = async () => {
  departments.value = await staffHttp.getAllDepartment();
};

const refreshAll = async () => {
  loading.init = true;
  try {
    await Promise.all([loadConfig(), loadStats(), loadSources(), loadConversations(), loadDepartments()]);
  } catch (detail) {
    ElMessage.error(detail);
  } finally {
    loading.init = false;
  }
};

const scrollChatBottom = async () => {
  await nextTick();
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight;
  }
};

const startNewConversation = () => {
  activeConversation.value = null;
  messages.value = [];
  question.value = "";
};

const openConversation = async (conversation) => {
  try {
    const data = await agentHttp.getConversation(conversation.id);
    activeConversation.value = data;
    messages.value = data.messages || [];
    await scrollChatBottom();
  } catch (detail) {
    ElMessage.error(detail);
  }
};

const sendQuestion = async () => {
  const text = question.value.trim();
  if (!text) {
    ElMessage.warning("请输入问题");
    return;
  }

  const userMessage = {
    id: `local-${Date.now()}`,
    role: "user",
    content: text,
    created_at: new Date().toISOString(),
  };
  messages.value.push(userMessage);
  question.value = "";
  loading.asking = true;
  await scrollChatBottom();

  // 先放一个空的助手气泡，收到 delta 后逐字追加（打字机效果）
  const assistantMessage = {
    id: `local-${Date.now()}-a`,
    role: "assistant",
    content: "",
    citations: [],
    metadata: {},
    created_at: new Date().toISOString(),
  };
  messages.value.push(assistantMessage);
  await scrollChatBottom();

  const payload = {
    question: text,
    top_k: topK.value,
    web_search: webSearchEnabled.value,
  };
  if (activeConversation.value?.id) {
    payload.conversation_id = activeConversation.value.id;
  }
  if (selectedSourceIds.value.length && !allSourceSelected.value) {
    payload.source_ids = selectedSourceIds.value;
  }

  let settled = false;
  const finish = () => {
    if (!settled) {
      settled = true;
      loading.asking = false;
    }
  };

  try {
    await agentHttp.askStream(payload, {
      onStart: (event) => {
        assistantMessage.message_id = event.message_id;
        assistantMessage.conversation_id = event.conversation_id;
        if (event.references?.length) {
          assistantMessage.citations = event.references;
        }
      },
      onDelta: (event) => {
        assistantMessage.content += event.content || "";
      },
      onDone: (event) => {
        assistantMessage.id = event.message_id;
        assistantMessage.content = event.answer;
        assistantMessage.citations = event.sources || [];
        assistantMessage.metadata = { usage: event.usage || {} };
        if (event.conversation_id) {
          activeConversation.value = {
            ...(activeConversation.value || {}),
            id: event.conversation_id,
            title: activeConversation.value?.title || text.slice(0, 48),
          };
          Promise.all([loadConversations(), loadStats()]).catch(() => {});
        }
        finish();
      },
      onError: (event) => {
        if (!assistantMessage.content) {
          messages.value = messages.value.filter((item) => item.id !== assistantMessage.id);
        }
        question.value = text;
        ElMessage.error(event.detail || "网络错误");
        finish();
      },
    });
    await scrollChatBottom();
  } catch (detail) {
    messages.value = messages.value.filter(
      (item) => item.id !== assistantMessage.id && item.id !== userMessage.id
    );
    question.value = text;
    ElMessage.error(detail);
    finish();
  } finally {
    finish();
  }
};

const onQuestionKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendQuestion();
  }
};

const submitFeedback = async (message, score) => {
  if (!activeConversation.value?.id) {
    return;
  }
  try {
    await agentHttp.createFeedback({
      conversation_id: activeConversation.value.id,
      message_id: message.id,
      score,
      comment: "",
    });
    ElMessage.success("反馈已记录");
  } catch (detail) {
    ElMessage.error(detail);
  }
};

const onUploadChange = (uploadFile) => {
  uploadForm.file = uploadFile.raw;
  if (!uploadForm.title) {
    uploadForm.title = uploadFile.name.replace(/\.[^.]+$/, "");
  }
};

const resetUploadForm = () => {
  uploadForm.title = "";
  uploadForm.content = "";
  uploadForm.file = null;
  uploadFileRef.value?.clearFiles();
  uploadForm.is_public = true;
  uploadForm.department_ids = [];
  uploadFormRef.value?.clearValidate();
};

const submitUpload = () => {
  uploadFormRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }
    if (!uploadForm.file && !uploadForm.content.trim()) {
      ElMessage.warning("请上传文件或填写正文");
      return;
    }

    loading.uploading = true;
    try {
      await agentHttp.uploadSource({
        title: uploadForm.title,
        content: uploadForm.content,
        file: uploadForm.file,
        is_public: uploadForm.is_public,
        department_ids: uploadForm.is_public ? [] : uploadForm.department_ids,
        metadata: {},
      });
      ElMessage.success("知识已导入");
      uploadVisible.value = false;
      resetUploadForm();
      await Promise.all([loadSources(), loadStats(), loadConfig()]);
    } catch (detail) {
      ElMessage.error(detail);
    } finally {
      loading.uploading = false;
    }
  });
};

const syncInforms = async () => {
  loading.syncing = true;
  try {
    const data = await agentHttp.syncInforms();
    ElMessage.success(`${data.detail || "同步完成"}，共 ${data.count || 0} 条`);
    await Promise.all([loadSources(), loadStats(), loadConfig()]);
  } catch (detail) {
    ElMessage.error(detail);
  } finally {
    loading.syncing = false;
  }
};

const selectedSourceCount = computed(() => selectedSourceRows.value.length);

const reindexSources = async (useSelected = true) => {
  const ids = useSelected ? selectedSourceRows.value.map((item) => item.id) : [];
  if (useSelected && !ids.length) {
    ElMessage.warning("请先勾选需要重建的知识源");
    return;
  }
  loading.reindexing = true;
  try {
    const data = await agentHttp.reindexSources(ids);
    ElMessage.success(`重建完成：成功 ${data.success || 0} 条，失败 ${data.failed?.length || 0} 条`);
    selectedSourceRows.value = [];
    await Promise.all([loadSources(), loadStats()]);
  } catch (detail) {
    ElMessage.error(detail);
  } finally {
    loading.reindexing = false;
  }
};

// 一键重建所有“失败”状态的知识源，无需勾选
const reindexFailedSources = async () => {
  loading.reindexing = true;
  try {
    const data = await agentHttp.reindexSources([], true);
    ElMessage.success(`重建失败项完成：成功 ${data.success || 0} 条，失败 ${data.failed?.length || 0} 条`);
    selectedSourceRows.value = [];
    await Promise.all([loadSources(), loadStats()]);
  } catch (detail) {
    ElMessage.error(detail);
  } finally {
    loading.reindexing = false;
  }
};

// 单行重建
const reindexSource = async (row) => {
  loading.reindexing = true;
  try {
    const data = await agentHttp.reindexSources([row.id]);
    ElMessage.success(`重建完成：成功 ${data.success || 0} 条，失败 ${data.failed?.length || 0} 条`);
    await loadSources();
  } catch (detail) {
    ElMessage.error(detail);
  } finally {
    loading.reindexing = false;
  }
};

// 批量删除选中的知识源
const batchDeleteSources = async () => {
  const ids = selectedSourceRows.value.map((item) => item.id);
  if (!ids.length) {
    ElMessage.warning("请先勾选要删除的知识源");
    return;
  }
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 个知识源？删除后不可恢复。`, "提示", { type: "warning" });
    loading.deleting = true;
    const data = await agentHttp.batchDeleteSources(ids);
    ElMessage.success(data.detail || `已删除 ${data.deleted || 0} 个知识源`);
    selectedSourceRows.value = [];
    await Promise.all([loadSources(), loadStats(), loadConfig()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error);
    }
  } finally {
    loading.deleting = false;
  }
};

const deleteSource = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除知识源“${row.title}”？`, "提示", { type: "warning" });
    await agentHttp.deleteSource(row.id);
    ElMessage.success("知识源已删除");
    await Promise.all([loadSources(), loadStats(), loadConfig()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error);
    }
  }
};

const deleteConversation = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除会话“${row.title || row.last_question}”？`, "提示", { type: "warning" });
    await agentHttp.deleteConversation(row.id);
    if (activeConversation.value?.id === row.id) {
      startNewConversation();
    }
    ElMessage.success("会话已删除");
    await Promise.all([loadConversations(), loadStats()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error);
    }
  }
};

const resetSourceFilters = async () => {
  sourceFilters.search = "";
  sourceFilters.source_type = "";
  sourceFilters.status = "";
  sourcePagination.page = 1;
  await loadSources();
};

onMounted(refreshAll);
</script>

<template>
  <OAmain title="智能助手">
    <el-row :gutter="16" class="agent-stats">
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-box">
          <span>知识源</span>
          <strong>{{ stats.source_count || 0 }}</strong>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-box">
          <span>已索引</span>
          <strong>{{ stats.indexed_source_count || 0 }}</strong>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-box">
          <span>片段</span>
          <strong>{{ stats.chunk_count || 0 }}</strong>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-box">
          <span>会话</span>
          <strong>{{ stats.conversation_count || 0 }}</strong>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-box">
          <span>模型</span>
          <strong class="stat-model">{{ currentModel }}</strong>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <div class="stat-box">
          <span>服务</span>
          <el-tag :type="config.llm?.ready && config.embedding?.ready ? 'success' : 'danger'">
            {{ config.llm?.ready && config.embedding?.ready ? "可用" : "待配置" }}
          </el-tag>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="agent-layout">
      <el-col :xs="24" :lg="5">
        <el-card class="panel-card conversation-panel">
          <template #header>
            <div class="panel-header">
              <span>会话</span>
              <el-button :icon="CirclePlus" type="primary" @click="startNewConversation">新会话</el-button>
            </div>
          </template>
          <el-scrollbar height="560px" v-loading="loading.conversations">
            <div
              v-for="item in conversations"
              :key="item.id"
              class="conversation-item"
              :class="{ active: activeConversation?.id === item.id }"
              @click="openConversation(item)"
            >
              <div class="conversation-title">{{ item.title || item.last_question || "未命名会话" }}</div>
              <div class="conversation-meta">{{ item.question_count }} 问 · {{ formatDateTime(item.updated_at) }}</div>
              <el-button class="conversation-delete" :icon="Delete" text @click.stop="deleteConversation(item)" />
            </div>
            <el-empty v-if="!conversations.length" description="暂无会话" />
          </el-scrollbar>
          <template #footer>
            <OAPagination v-model="conversationPagination.page" :total="conversationPagination.total" @update:model-value="loadConversations" />
          </template>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="panel-card chat-panel">
          <template #header>
            <div class="panel-header">
              <span>{{ activeConversation?.title || "知识问答" }}</span>
              <el-tag type="info">{{ topK }} 条参考</el-tag>
            </div>
          </template>

          <div ref="chatBodyRef" class="chat-body" v-loading="loading.asking && !messages.length">
            <div v-if="!messages.length" class="chat-empty">
              <el-icon><ChatDotRound /></el-icon>
              <span>开始提问</span>
            </div>

            <div
              v-for="message in messages"
              :key="message.id"
              class="message-row"
              :class="message.role"
            >
              <div class="message-bubble">
                <div class="message-role">{{ message.role === "user" ? "我" : "助手" }}</div>
                <div
                  v-if="message.role === 'assistant'"
                  class="message-content"
                  v-html="renderAnswerContent(message.content, message.citations)"
                  @click="onMessageContentClick($event, message)"
                ></div>
                <div v-else class="message-content">{{ message.content }}</div>
                <div v-if="message.citations?.length" class="citation-summary">
                  <button class="citation-toggle" type="button" @click="openCitationDialog(message)">
                    <div class="citation-toggle-left">
                      <span class="citation-toggle-badge">{{ message.citations.length }}</span>
                      <div>
                        <div class="citation-toggle-title">引用证据</div>
                        <div class="citation-toggle-desc">点击查看完整来源、片段与上下文</div>
                      </div>
                    </div>
                    <el-icon class="citation-toggle-icon"><Document /></el-icon>
                  </button>
                  <div class="citation-preview">
                    <div
                      v-for="(source, index) in sortCitations(message.citations).slice(0, 2)"
                      :key="`${source.source_id}-${source.chunk_id}-${index}`"
                      class="citation-preview-item"
                    >
                      <span class="citation-preview-index">{{ citationIndexText(index) }}</span>
                      <a
                        v-if="isWebLink(source)"
                        :href="source.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="citation-preview-text citation-preview-link"
                        :title="source.title || source.url"
                      >{{ source.title || formatCitationExcerpt(source.excerpt) }} ↗</a>
                      <span v-else class="citation-preview-text">{{ source.title || formatCitationExcerpt(source.excerpt) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="message.role === 'assistant' && !String(message.id).startsWith('local-')" class="feedback-actions">
                  <el-button size="small" text @click="submitFeedback(message, 1)">有帮助</el-button>
                  <el-button size="small" text @click="submitFeedback(message, -1)">需改进</el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="chat-controls">
            <div class="knowledge-picker">
              <div class="knowledge-label">知识范围</div>
              <div class="knowledge-picker-main">
                <el-select
                  v-model="selectedSourceIds"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  collapse-tags-tooltip
                  placeholder="限定知识源"
                >
                  <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
                <el-checkbox
                  :model-value="allSourceSelected"
                  :indeterminate="sourceSelectionIndeterminate"
                  :disabled="!sourceOptions.length"
                  @change="toggleSourceSelection"
                >
                  全选
                </el-checkbox>
              </div>
              <div class="knowledge-help">选中后会优先只检索这些知识源；留空则使用全部可用知识源。</div>
            </div>
            <div class="web-search-toggle">
              <el-switch v-model="webSearchEnabled" />
              <span class="web-search-label">联网搜索</span>
            </div>
          </div>
          <div class="ask-box">
            <el-input
              v-model="question"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 6 }"
              placeholder="输入问题，Enter 发送"
              @keydown="onQuestionKeydown"
            />
            <el-button type="primary" :icon="ChatDotRound" :loading="loading.asking" @click="sendQuestion">发送</el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="7">
        <el-card class="panel-card source-panel">
          <template #header>
            <div class="panel-header">
              <span>知识库</span>
              <div class="header-actions">
                <el-button :icon="UploadFilled" type="primary" @click="uploadVisible = true">导入</el-button>
                <el-button :icon="Refresh" :loading="loading.syncing" @click="syncInforms">同步通知</el-button>
              </div>
            </div>
          </template>

          <div class="source-filters">
            <el-input v-model="sourceFilters.search" :prefix-icon="Search" clearable placeholder="搜索知识" @keyup.enter="loadSources" />
            <el-select v-model="sourceFilters.source_type" clearable placeholder="类型">
              <el-option label="通知" value="inform" />
              <el-option label="上传" value="upload" />
              <el-option label="手动" value="manual" />
              <el-option label="FAQ" value="faq" />
            </el-select>
            <el-select v-model="sourceFilters.status" clearable placeholder="状态">
              <el-option label="待索引" value="pending" />
              <el-option label="已索引" value="indexed" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-button :icon="Search" @click="loadSources" />
            <el-button @click="resetSourceFilters">重置</el-button>
          </div>

          <el-table
            :data="sources"
            height="430"
            v-loading="loading.sources"
            @selection-change="selectedSourceRows = $event"
          >
            <el-table-column type="selection" width="40" />
            <el-table-column type="expand" width="40">
              <template #default="scope">
                <div class="source-expand">
                  <p>{{ scope.row.content_preview || scope.row.summary || "暂无预览" }}</p>
                  <span>可见范围：{{ visibilityText(scope.row) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="标题" min-width="96" show-overflow-tooltip>
              <template #default="scope">
                <div class="source-title">
                  <el-icon><Document /></el-icon>
                  <span>{{ scope.row.title }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="64">
              <template #default="scope">{{ sourceTypeText(scope.row.source_type, scope.row.source_type_label) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="72">
              <template #default="scope">
                <el-tag :type="statusType(scope.row.status)">{{ statusText(scope.row.status, scope.row.status_label) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="片段" prop="chunk_count" width="76" align="center" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="scope">
                <el-button :icon="RefreshRight" text @click="reindexSource(scope.row)">重建</el-button>
                <el-button :icon="Delete" type="danger" text @click="deleteSource(scope.row)" />
              </template>
            </el-table-column>
          </el-table>

          <template #footer>
            <div class="source-footer">
              <OAPagination v-model="sourcePagination.page" :total="sourcePagination.total" @update:model-value="loadSources" />
              <div class="source-footer-actions">
                <span v-if="selectedSourceCount" class="source-selected-count">已选 {{ selectedSourceCount }} 项</span>
                <el-button
                  type="danger"
                  plain
                  :icon="Delete"
                  :loading="loading.deleting"
                  :disabled="!selectedSourceCount"
                  @click="batchDeleteSources"
                >
                  批量删除
                </el-button>
                <el-button :icon="RefreshRight" :loading="loading.reindexing" @click="reindexFailedSources">
                  重建失败项
                </el-button>
                <el-button
                  type="primary"
                  :icon="Files"
                  :loading="loading.reindexing"
                  :disabled="!selectedSourceCount"
                  @click="reindexSources(true)"
                >
                  重建选中
                </el-button>
              </div>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="uploadVisible" title="导入知识" width="640px" @closed="resetUploadForm">
      <el-form ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-width="96px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="uploadForm.title" placeholder="知识标题" />
        </el-form-item>
        <el-form-item label="文件">
          <el-upload ref="uploadFileRef" drag :auto-upload="false" :limit="1" :on-change="onUploadChange" :on-remove="() => (uploadForm.file = null)">
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件或点击上传</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="uploadForm.content" type="textarea" :rows="6" placeholder="也可以直接粘贴文本" />
        </el-form-item>
        <el-form-item label="公开">
          <el-switch v-model="uploadForm.is_public" />
        </el-form-item>
        <el-form-item v-if="!uploadForm.is_public" label="部门">
          <el-select v-model="uploadForm.department_ids" multiple filterable placeholder="选择可见部门" style="width: 100%">
            <el-option v-for="department in departments" :key="department.id" :label="department.name" :value="department.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading.uploading" @click="submitUpload">提交</el-button>
      </template>
  </el-dialog>

  <el-dialog
    v-model="citationDialogVisible"
    :title="activeCitationMessage?.role === 'assistant' ? '引用证据' : '消息引用'"
    width="1080px"
    class="citation-dialog"
    @closed="activeCitationMessage = null"
  >
    <div v-if="activeCitationMessage" class="citation-dialog-body">
      <div class="citation-dialog-summary">
        <div class="citation-dialog-question">关联回复</div>
        <div class="citation-dialog-content" v-html="renderAnswerContent(activeCitationMessage.content, activeCitationMessage.citations)"></div>
        <div
          v-if="sortedCitations.length > MAX_VISIBLE_CITATIONS"
          class="citation-dialog-tip"
        >
          共 {{ sortedCitations.length }} 条引用，已按相关度展示最相关的 {{ MAX_VISIBLE_CITATIONS }} 条
        </div>
      </div>
      <div class="citation-dialog-grid">
        <article
          v-for="(source, index) in visibleCitations"
          :key="`${source.source_id}-${source.chunk_id}-${index}`"
          class="citation-card citation-card-modal"
        >
          <div class="citation-card-head">
            <div class="citation-index" :class="`is-${citationTypeType(source)}`">{{ citationIndexText(index) }}</div>
            <div class="citation-head-main">
              <a
                v-if="isWebLink(source)"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="citation-title-link"
                :title="source.title || source.url"
              >
                <h4 class="citation-title">{{ source.title || `引用片段 ${citationIndexText(index)}` }}</h4>
                <span class="citation-link-icon">↗</span>
              </a>
              <h4 v-else class="citation-title">{{ source.title || `引用片段 ${citationIndexText(index)}` }}</h4>
              <div class="citation-meta">
                <span
                  v-for="item in citationMetaText(source)"
                  :key="item"
                  class="citation-pill"
                  :class="`is-${citationTypeType(source)}`"
                >{{ item }}</span>
                <span
                  v-if="citationScoreText(source.score)"
                  class="citation-pill is-score"
                >相关度 {{ citationScoreText(source.score) }}</span>
              </div>
            </div>
          </div>
          <div class="citation-excerpt">
            <div class="citation-quote-mark">“</div>
            <p>{{ formatCitationExcerpt(source.excerpt) }}</p>
          </div>
        </article>
      </div>
    </div>
  </el-dialog>
  </OAmain>
</template>

<style scoped>
.agent-stats {
  row-gap: 12px;
}

.stat-box {
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stat-box span {
  color: #6b7280;
  font-size: 13px;
}

.stat-box strong {
  font-size: 22px;
  color: #1f2937;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-box .stat-model {
  font-size: 14px;
}

.agent-layout {
  row-gap: 16px;
}

.panel-card {
  height: 700px;
}

.panel-card :deep(.el-card__body) {
  height: calc(100% - 116px);
  box-sizing: border-box;
}

.panel-header,
.source-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.source-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.source-selected-count {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  margin-right: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.conversation-item {
  position: relative;
  padding: 12px 40px 12px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.conversation-item:hover,
.conversation-item.active {
  background: #f5f7fa;
  border-color: #dcdfe6;
}

.conversation-title {
  color: #1f2937;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}

.conversation-delete {
  position: absolute;
  top: 8px;
  right: 6px;
}

.chat-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 2px;
}

.chat-empty {
  height: 100%;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #909399;
}

.chat-empty .el-icon {
  font-size: 42px;
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 84%;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #1f2937;
}

.message-row.user .message-bubble {
  background: #ecf5ff;
}

.message-role {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.7;
  word-break: break-word;
}

.message-content h3 {
  margin: 12px 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  line-height: 1.5;
}

.message-content h3:first-child {
  margin-top: 0;
}

.message-content strong {
  font-weight: 700;
}

.citation-ref.el-tag {
  height: 18px;
  padding: 0 5px;
  margin: 0 2px 0 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  vertical-align: super;
  cursor: pointer;
  user-select: none;
  border: none;
}
.citation-ref.el-tag.el-tag--info {
  cursor: not-allowed;
  text-decoration: line-through;
}
.citation-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.citation-toggle {
  width: 100%;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  padding: 12px 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.citation-toggle:hover {
  border-color: #c7d2fe;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.citation-toggle-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.citation-toggle-badge {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 13px;
  font-weight: 700;
}

.citation-toggle-title {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.citation-toggle-desc {
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.citation-toggle-icon {
  color: #94a3b8;
  font-size: 18px;
  flex: none;
}

.citation-preview {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.citation-preview-item {
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.citation-preview-index {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  flex: none;
}

.citation-preview-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.citation-preview-link {
  color: #2563eb;
  text-decoration: none;
  cursor: pointer;
}

.citation-preview-link:hover {
  text-decoration: underline;
}

.citation-card {
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.citation-card:hover {
  transform: translateY(-1px);
  border-color: #c7d2fe;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.citation-card-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.citation-index {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.citation-index.is-inform {
  background: #eff6ff;
  color: #2563eb;
}

.citation-index.is-upload {
  background: #ecfdf5;
  color: #059669;
}

.citation-index.is-manual {
  background: #faf5ff;
  color: #9333ea;
}

.citation-index.is-web {
  background: #fff7ed;
  color: #ea580c;
}

.citation-index.is-faq,
.citation-index.is-other {
  background: #f1f5f9;
  color: #475569;
}

.citation-head-main {
  min-width: 0;
  flex: 1;
}

.citation-title {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.citation-title-link .citation-title {
  color: inherit;
}

.citation-title-link {
  color: #2563eb;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.citation-title-link:hover {
  text-decoration: underline;
}

.citation-link-icon {
  font-size: 12px;
  color: #6b7280;
  flex: none;
}

.citation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.citation-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.citation-pill.is-inform {
  background: #eff6ff;
  color: #1d4ed8;
}

.citation-pill.is-upload {
  background: #ecfdf5;
  color: #047857;
}

.citation-pill.is-manual {
  background: #faf5ff;
  color: #7e22ce;
}

.citation-pill.is-web {
  background: #fff7ed;
  color: #c2410c;
}

.citation-pill.is-faq,
.citation-pill.is-other {
  background: #f1f5f9;
  color: #475569;
}

.citation-pill.is-score {
  background: #fefce8;
  color: #a16207;
  font-weight: 700;
}

.citation-excerpt {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  color: #374151;
  line-height: 1.7;
}

.citation-quote-mark {
  color: #cbd5e1;
  font-size: 20px;
  line-height: 1;
  flex: none;
}

.citation-excerpt p {
  margin: 0;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.citation-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
  padding-bottom: 6px;
  max-height: 74vh;
  overflow-y: auto;
}

.citation-dialog-body {
  display: grid;
  gap: 16px;
}

.citation-dialog-summary {
  padding: 14px 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.citation-dialog-question {
  color: #6b7280;
  font-size: 12px;
  margin-bottom: 8px;
}

.citation-dialog-content {
  color: #111827;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.citation-dialog-content h3 {
  margin: 12px 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  line-height: 1.5;
}

.citation-dialog-content h3:first-child {
  margin-top: 0;
}

.citation-dialog-content strong {
  font-weight: 700;
}

.citation-dialog-tip {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  font-size: 12px;
  line-height: 1.5;
}

.citation-dialog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px 16px;
  padding: 4px 4px 12px;
}

.citation-card-modal {
  min-height: 100%;
}

.feedback-actions {
  margin-top: 8px;
}

.chat-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.knowledge-picker {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fbfdff;
}

.knowledge-label {
  color: #374151;
  font-size: 13px;
  font-weight: 700;
}

.knowledge-picker-main {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.knowledge-help {
  grid-column: 2 / 3;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.web-search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fbfdff;
}

.web-search-label {
  color: #374151;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.ask-box {
  display: grid;
  grid-template-columns: 1fr 88px;
  gap: 10px;
  align-items: stretch;
}

.ask-box .el-button {
  height: 100%;
}

.source-filters {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 92px 92px 36px 56px;
  gap: 8px;
  margin-bottom: 12px;
}

.source-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.source-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-expand {
  padding: 10px 28px;
  color: #606266;
  line-height: 1.7;
}

.source-expand span {
  display: block;
  margin-top: 8px;
  color: #909399;
}

.source-footer {
  align-items: center;
}

@media (max-width: 1200px) {
  .panel-card {
    height: auto;
    min-height: 560px;
  }

  .panel-card :deep(.el-card__body) {
    height: auto;
  }

  .chat-body {
    height: 420px;
    flex: none;
  }

  .citation-dialog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .source-filters,
  .chat-controls,
  .ask-box {
    grid-template-columns: 1fr;
  }

  .knowledge-picker {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .knowledge-help {
    grid-column: auto;
  }

  .panel-header,
  .source-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .message-bubble {
    max-width: 94%;
  }
}
</style>
