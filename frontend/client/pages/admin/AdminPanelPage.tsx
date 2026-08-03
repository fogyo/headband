import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";
import homeIconUrl from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";
import { X, Copy, Trash2, Plus } from "lucide-react";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ---------- Типы ----------
interface LinkItem {
  link: string;
  level: number;
  created: string;
  activation: number; // 1 = ACTIVE, 2 = INACTIVE
}

interface AdminListResponse {
  status: string;
  admins: number[];
}

export default function AdminPanelPage() {
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  // Состояния для ссылок
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkLevel, setLinkLevel] = useState<1 | 2>(1);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [generatingLink, setGeneratingLink] = useState(false);

  // Состояния для токенов
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenChatId, setTokenChatId] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenType, setTokenType] = useState<1 | 2>(1); // 1=Base, 2=Super
  const [sendingTokens, setSendingTokens] = useState(false);

  // Состояния для админов
  const [admins, setAdmins] = useState<number[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newAdminChatId, setNewAdminChatId] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Загрузка ссылок
  const fetchLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch(`${baseUrl}/admins/control/get_links`);
      if (!res.ok) throw new Error("Ошибка загрузки ссылок");
      const data = await res.json();
      if (data.status === "success") {
        setLinks(data.links || []);
      } else {
        throw new Error(data.status);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось загрузить ссылки");
    } finally {
      setLoadingLinks(false);
    }
  };

  // Загрузка админов
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch(`${baseUrl}/admins/control/list_of_admins`);
      if (!res.ok) throw new Error("Ошибка загрузки админов");
      const data: AdminListResponse = await res.json();
      if (data.status === "success") {
        setAdmins(data.admins || []);
      } else {
        throw new Error(data.status);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось загрузить админов");
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (isVerified && chatId) {
      fetchLinks();
      fetchAdmins();
    }
  }, [isVerified, chatId]);

  // ----- Ссылки -----
  const handleGenerateLink = async () => {
    if (!chatId) return;
    setGeneratingLink(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/control/create_unique_link?chat_id=${chatId}&level=${linkLevel}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Ошибка генерации ссылки");
      const data = await res.json();
      if (data.status === "success") {
        setGeneratedLink(data.link);
        toast.success("Ссылка сгенерирована");
        await fetchLinks(); // обновляем таблицу
      } else {
        throw new Error(data.status || "Ошибка");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось создать ссылку");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Ссылка скопирована!");
  };

  // ----- Токены -----
  const handleGiveTokens = async () => {
    if (!chatId) return;
    if (!tokenChatId.trim() || !tokenAmount.trim()) {
      toast.warning("Заполните все поля");
      return;
    }
    const amountNum = parseInt(tokenAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.warning("Количество должно быть положительным числом");
      return;
    }
    setSendingTokens(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/control/increase_tokens?chat_id=${chatId}&chat_id_to_give=${parseInt(tokenChatId, 10)}&amount=${amountNum}&type_token=${tokenType}`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Ошибка выдачи токенов");
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Токены успешно выданы");
        setIsTokenModalOpen(false);
        setTokenChatId("");
        setTokenAmount("");
      } else {
        throw new Error(data.status || "Ошибка выдачи");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось выдать токены");
    } finally {
      setSendingTokens(false);
    }
  };

  // ----- Админы -----
  const handleDeleteAdmin = async (adminChatId: number) => {
    if (!chatId) return;
    if (!window.confirm(`Удалить админа с chat_id ${adminChatId}?`)) return;
    try {
      const res = await fetch(
        `${baseUrl}/admins/control/delete_admin?chat_id=${chatId}&chat_id_of_del_admin=${adminChatId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Ошибка удаления");
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Админ удалён");
        await fetchAdmins();
      } else {
        throw new Error(data.status || "Ошибка удаления");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось удалить админа");
    }
  };

  const handleCreateAdmin = async () => {
    if (!chatId) return;
    if (!newAdminChatId.trim()) {
      toast.warning("Введите chat_id");
      return;
    }
    setCreatingAdmin(true);
    try {
      const res = await fetch(
        `${baseUrl}/admins/control/create_admin?chat_id=${chatId}&chat_id_of_new_admin=${parseInt(newAdminChatId, 10)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Ошибка создания админа");
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Админ добавлен");
        setIsAdminModalOpen(false);
        setNewAdminChatId("");
        await fetchAdmins();
      } else {
        throw new Error(data.status || "Ошибка создания");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось добавить админа");
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-black font-['Sofia_Sans']">Загрузка...</p>
      </div>
    );
  }

  if (authError || !isVerified) {
    return (
      <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center">
        <p className="text-red-500 font-['Sofia_Sans']">{authError || "Ошибка авторизации"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка назад */}
        <Link
          to="/admin"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Header */}
        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            admin panel
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for admins
          </p>
        </div>

        {/* 1. Ссылки */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Ссылки</h2>
            <button
              onClick={() => {
                setIsLinkModalOpen(true);
                setGeneratedLink("");
                setLinkLevel(1);
              }}
              className="relative bg-[#FFE9EF] rounded-[10px] py-1.5 px-4 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              + Создать
            </button>
          </div>
          <div className="h-px bg-black w-32 mb-4" />

          <div
            className="relative bg-white rounded-[10px] p-3 shadow-inner overflow-y-auto"
            style={{
              boxShadow: "inset 4px 4px 4px rgba(0, 0, 0, 0.25)",
              maxHeight: "300px",
            }}
          >
            {loadingLinks ? (
              <p className="text-black/50 text-center font-['Sofia_Sans']">Загрузка...</p>
            ) : links.length === 0 ? (
              <p className="text-black/50 text-center font-['Sofia_Sans']">Нет ссылок</p>
            ) : (
              <div className="flex flex-col">
                {/* Заголовки */}
                <div className="flex items-center text-[12px] font-['Sofia_Sans'] text-black/50 border-b border-black/10 pb-1 mb-2">
                  <div className="flex-1">Ссылка</div>
                  <div className="w-16 text-center">Уровень</div>
                  <div className="w-20 text-center">Статус</div>
                  <div className="w-24 text-center">Создана</div>
                </div>
                {/* Строки */}
                {links.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center text-[12px] font-['Sofia_Sans'] text-black py-1.5 border-b border-black/5 last:border-0"
                  >
                    <div 
                        className="flex-1 truncate cursor-pointer hover:text-black/70 transition-colors" 
                        onClick={() => {
                            navigator.clipboard.writeText(item.link);
                            toast.success("Ссылка скопирована!");
                        }}
                        title="Нажмите, чтобы скопировать"
                        >
                        {item.link}
                    </div>
                    <div className="w-16 text-center">{item.level === 1 ? "BASE" : "PARTNER"}</div>
                    <div className="w-20 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          item.activation === 1 ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span className={item.activation === 1 ? "text-green-600" : "text-red-600"}>
                        {item.activation === 1 ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <div className="w-24 text-center text-black/50">{item.created}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 2. Выдача токенов */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Выдача токенов</h2>
          <div className="h-px bg-black w-32 mb-4" />
          <button
            onClick={() => setIsTokenModalOpen(true)}
            className="relative bg-[#FFE9EF] rounded-[10px] py-2.5 px-6 shadow-sm text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black"
            style={{
              border: "0.5px solid rgba(0,0,0,0.00)",
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            Выдать токены
          </button>
        </section>

        {/* 3. Админы */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Админы</h2>
            <button
              onClick={() => {
                setIsAdminModalOpen(true);
                setNewAdminChatId("");
              }}
              className="relative bg-[#FFE9EF] rounded-[10px] py-1.5 px-4 shadow-sm text-[14px] tracking-[-0.7px] font-['Sofia_Sans'] text-black"
              style={{
                border: "0.5px solid rgba(0,0,0,0.00)",
                boxShadow:
                  "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
              }}
            >
              + Добавить
            </button>
          </div>
          <div className="h-px bg-black w-32 mb-4" />

          <div
            className="relative bg-white rounded-[10px] p-3 shadow-inner overflow-y-auto"
            style={{
              boxShadow: "inset 4px 4px 4px rgba(0, 0, 0, 0.25)",
              maxHeight: "200px",
            }}
          >
            {loadingAdmins ? (
              <p className="text-black/50 text-center font-['Sofia_Sans']">Загрузка...</p>
            ) : admins.length === 0 ? (
              <p className="text-black/50 text-center font-['Sofia_Sans']">Нет админов</p>
            ) : (
              admins.map((adminChatId) => (
                <div
                  key={adminChatId}
                  className="flex items-center justify-between py-2 border-b border-black/5 last:border-0"
                >
                  <span className="text-[14px] font-['Sofia_Sans'] text-black">{adminChatId}</span>
                  <button
                    onClick={() => handleDeleteAdmin(adminChatId)}
                    className="text-black/50 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Модалка создания ссылки */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm p-6 shadow-xl"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
              Создать ссылку
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              {/* Выбор уровня */}
              <div className="flex gap-3">
                <button
                  onClick={() => setLinkLevel(1)}
                  className={`flex-1 py-2 rounded-[10px] shadow-sm text-[16px] font-['Sofia_Sans'] ${
                    linkLevel === 1
                      ? "bg-[#7FD1AE]/60 text-black"
                      : "bg-[#FFE9EF] text-black/50"
                  }`}
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  BASE
                </button>
                <button
                  onClick={() => setLinkLevel(2)}
                  className={`flex-1 py-2 rounded-[10px] shadow-sm text-[16px] font-['Sofia_Sans'] ${
                    linkLevel === 2
                      ? "bg-[#7FD1AE]/60 text-black"
                      : "bg-[#FFE9EF] text-black/50"
                  }`}
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  PARTNER
                </button>
              </div>

              {/* Кнопка генерации */}
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center disabled:opacity-50"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                {generatingLink ? (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                    Генерация...
                  </span>
                ) : (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    Сгенерировать
                  </span>
                )}
              </button>

              {/* Отображение сгенерированной ссылки */}
              {generatedLink && (
                <div className="mt-2 flex items-center gap-2 bg-white rounded-[10px] p-2 shadow-inner">
                  <span className="flex-1 text-[14px] font-['Sofia_Sans'] text-black break-all">
                    {generatedLink}
                  </span>
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="text-black/50 hover:text-black"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка выдачи токенов */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm p-6 shadow-xl"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={() => setIsTokenModalOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
              Выдать токены
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              {/* Chat ID */}
              <div
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-3"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <input
                  type="number"
                  placeholder="Chat ID"
                  value={tokenChatId}
                  onChange={(e) => setTokenChatId(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                />
              </div>

              {/* Количество */}
              <div
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-3"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <input
                  type="number"
                  placeholder="Количество"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                />
              </div>

              {/* Тип токенов */}
              <div className="flex gap-3">
                <button
                  onClick={() => setTokenType(1)}
                  className={`flex-1 py-2 rounded-[10px] shadow-sm text-[16px] font-['Sofia_Sans'] ${
                    tokenType === 1
                      ? "bg-[#7FD1AE]/60 text-black"
                      : "bg-[#FFE9EF] text-black/50"
                  }`}
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  Base
                </button>
                <button
                  onClick={() => setTokenType(2)}
                  className={`flex-1 py-2 rounded-[10px] shadow-sm text-[16px] font-['Sofia_Sans'] ${
                    tokenType === 2
                      ? "bg-[#7FD1AE]/60 text-black"
                      : "bg-[#FFE9EF] text-black/50"
                  }`}
                  style={{
                    border: "0.5px solid rgba(0,0,0,0.00)",
                    boxShadow:
                      "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                  }}
                >
                  Super
                </button>
              </div>

              <button
                onClick={handleGiveTokens}
                disabled={sendingTokens}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center disabled:opacity-50"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                {sendingTokens ? (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                    Отправка...
                  </span>
                ) : (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    Выдать
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления админа */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div
            className="relative bg-[#FFE9EF] rounded-[20px] w-full max-w-sm p-6 shadow-xl"
            style={{
              boxShadow:
                "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-black/50 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black text-center mb-4">
              Добавить админа
            </h3>
            <div className="h-px bg-black w-60 mx-auto mt-2 mb-4" />

            <div className="flex flex-col gap-4">
              <div
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow flex items-center px-3"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                <input
                  type="number"
                  placeholder="Chat ID"
                  value={newAdminChatId}
                  onChange={(e) => setNewAdminChatId(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-['Sofia_Sans'] text-black outline-none text-center placeholder-black/50"
                />
              </div>

              <button
                onClick={handleCreateAdmin}
                disabled={creatingAdmin}
                className="relative bg-[#FFE9EF] rounded-[10px] h-11 shadow w-full flex items-center justify-center disabled:opacity-50"
                style={{
                  border: "0.5px solid rgba(0,0,0,0.00)",
                  boxShadow:
                    "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                }}
              >
                {creatingAdmin ? (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black/50">
                    Добавление...
                  </span>
                ) : (
                  <span className="text-[16px] tracking-[-0.8px] font-['Sofia_Sans'] text-black">
                    Добавить
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}