import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTelegramAuth } from "@/App";
import homeIconUrl from "@/assets/home.svg";
import backIconSrc from "@/assets/back_icon.svg";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

interface Problem {
  problem_id: string;
  created: string; // "YYYY-MM-DD"
  text: string;
}

interface ProblemsResponse {
  status: string;
  pending_problems: Problem[];
  solved_problems: Problem[];
}

export default function AdminSupportPage() {
  const navigate = useNavigate();
  const { chatId, isVerified, isLoading: authLoading, error: authError } = useTelegramAuth();

  const [pendingProblems, setPendingProblems] = useState<Problem[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Модалка ответа
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyProblemId, setReplyProblemId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
  };

  const fetchProblems = async () => {
    try {
      const res = await fetch(`${baseUrl}/admins/support/`);
      if (!res.ok) throw new Error("Ошибка загрузки тикетов");
      const data: ProblemsResponse = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      setPendingProblems(data.pending_problems || []);
      setSolvedProblems(data.solved_problems || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Не удалось загрузить тикеты");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isVerified || !chatId) {
      if (authLoading) {
        setLoading(true);
        setError(null);
      } else if (authError) {
        setError(authError);
        setLoading(false);
      } else {
        setError("Ожидание авторизации...");
        setLoading(false);
      }
      return;
    }
    fetchProblems();
  }, [chatId, isVerified, authLoading, authError]);

  const openReplyModal = (problemId: string) => {
    setReplyProblemId(problemId);
    setReplyText("");
    setIsReplyModalOpen(true);
  };

  const closeReplyModal = () => {
    setIsReplyModalOpen(false);
    setReplyProblemId(null);
    setReplyText("");
  };

  const handleReplySubmit = async () => {
    if (!replyProblemId || !chatId) return;
    if (!replyText.trim()) {
      toast.error("Введите текст ответа");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/admins/support/communication_response?chat_id=${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_id: replyProblemId, text: replyText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка отправки");
      }
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.status);
      toast.success("Ответ отправлен");
      closeReplyModal();
      // Обновляем список
      await fetchProblems();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Не удалось отправить ответ");
    } finally {
      setIsSubmitting(false);
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

  if (loading) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p>Загрузка...</p></div>;
  if (error) return <div className="min-h-screen bg-[#FFE9EF] flex items-center justify-center"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[#FFE9EF]">
      <div className="max-w-sm mx-auto px-4 pb-10 relative">
        {/* Кнопка Home – в админку */}
        <Link
          to="/admin"
          className="absolute top-9 right-3 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={homeIconUrl} alt="home" className="w-6 h-6 relative z-10" />
        </Link>

        {/* Кнопка назад – в админку */}
        <button
          onClick={() => navigate("/admin")}
          className="absolute top-9 left-4 w-10 h-10 bg-[#FFE9EF] rounded-[5px] flex items-center justify-center z-20 shadow-[2px_2px_7px_0_rgba(0,0,0,0.10),9px_10px_13px_0_rgba(0,0,0,0.09)]"
        >
          <div className="absolute inset-0 bg-white rounded-[5px] blur-[20px] opacity-80" />
          <img src={backIconSrc} alt="back" className="w-6 h-6 relative z-10" />
        </button>

        <div className="pt-8 pb-2">
          <h1
            className="text-[40px] leading-tight tracking-[3.2px] text-transparent"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "1px #000" }}
          >
            support
          </h1>
          <p
            className="text-right text-[16px] tracking-[1.28px] text-transparent mt-[-4px]"
            style={{ fontFamily: "Poppins, sans-serif", WebkitTextStroke: "0.4px #000" }}
          >
            version for admins
          </p>
        </div>

        {/* Возникшие проблемы */}
        <section className="mt-8">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Возникшие проблемы</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          {pendingProblems.length === 0 ? (
            <p className="text-black/50 text-[14px] italic font-['Sofia_Sans']">Нет нерешённых проблем</p>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingProblems.map((problem) => (
                <div
                  key={problem.problem_id}
                  className="bg-white rounded-[10px] p-4 shadow-inner w-full h-40 overflow-hidden flex flex-col"
                  style={{ boxShadow: "inset 4px 4px 4px rgba(0, 0, 0, 0.25)" }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] font-['Sofia_Sans'] text-black/50">{formatDate(problem.created)}</span>
                    <span className="text-[10px] font-['Sofia_Sans'] text-red-500 bg-red-100 px-2 py-0.5 rounded">Новое</span>
                  </div>
                  <p className="text-[14px] font-['Sofia_Sans'] text-black flex-1 overflow-y-auto mt-1 break-words">
                    {problem.text}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => openReplyModal(problem.problem_id)}
                      className="bg-[#FFE9EF] rounded-[10px] py-1.5 px-4 shadow-sm text-[12px] font-['Sofia_Sans'] text-black"
                      style={{
                        border: "0.5px solid rgba(0,0,0,0.00)",
                        boxShadow:
                          "57px 60px 23px 0 rgba(0,0,0,0.00), 36px 38px 21px 0 rgba(0,0,0,0.01), 20px 22px 18px 0 rgba(0,0,0,0.05), 9px 10px 13px 0 rgba(0,0,0,0.09), 2px 2px 7px 0 rgba(0,0,0,0.10)",
                      }}
                    >
                      Ответить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Решённые проблемы */}
        <section className="mt-10">
          <h2 className="text-[24px] tracking-[-1.2px] font-['Sofia_Sans'] text-black">Решённые проблемы</h2>
          <div className="h-px bg-black w-[210px] mb-4" />

          {solvedProblems.length === 0 ? (
            <p className="text-black/50 text-[14px] italic font-['Sofia_Sans']">Нет решённых проблем</p>
          ) : (
            <div className="flex flex-col gap-4">
              {solvedProblems.map((problem) => (
                <div
                  key={problem.problem_id}
                  className="bg-white rounded-[10px] p-4 shadow-inner w-full h-40 overflow-hidden flex flex-col"
                  style={{ boxShadow: "inset 4px 4px 4px rgba(0, 0, 0, 0.25)" }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] font-['Sofia_Sans'] text-black/50">{formatDate(problem.created)}</span>
                    <span className="text-[10px] font-['Sofia_Sans'] text-green-600 bg-green-100 px-2 py-0.5 rounded">Решено</span>
                  </div>
                  <p className="text-[14px] font-['Sofia_Sans'] text-black flex-1 overflow-y-auto mt-1 break-words">
                    {problem.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Модальное окно ответа */}
      {isReplyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-[24px] font-semibold mb-4 text-black">Ответ на проблему</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-[14px] font-['Sofia_Sans'] text-black resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
              rows={4}
              placeholder="Введите ответ..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeReplyModal}
                className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleReplySubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#FA4F96] text-white rounded-lg text-[14px] font-medium hover:bg-[#e8447e] disabled:opacity-50"
              >
                {isSubmitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}