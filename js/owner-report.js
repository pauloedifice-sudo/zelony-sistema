// Owner daily report
// Manual trigger for dono profile to request the executive WhatsApp summary on demand.

const OWNER_REPORT_FUNCTION_NAME = "owner-daily-summary";
let ownerReportSolicitando = false;

function ownerReportBuildFunctionUrl() {
  return `${SB_URL}/functions/v1/${OWNER_REPORT_FUNCTION_NAME}`;
}

async function ownerReportInvoke(payload) {
  const response = await fetch(ownerReportBuildFunctionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && (data.error || data.message)
      ? String(data.error || data.message)
      : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data || {};
}

function ownerReportButtonLabel() {
  return ownerReportSolicitando ? "Enviando resumo..." : "Solicitar resumo no WhatsApp";
}

function ownerReportButtonHtml() {
  if (role !== "dono") return "";
  const disabled = ownerReportSolicitando ? "disabled" : "";
  const cursor = ownerReportSolicitando ? "not-allowed" : "pointer";
  const opacity = ownerReportSolicitando ? "0.7" : "1";
  return `
    <button
      type="button"
      id="cart-request-report-btn"
      onclick="dispararRelatorioDonoManual()"
      ${disabled}
      style="border:0;border-radius:12px;padding:10px 14px;background:linear-gradient(135deg,#1F7A54 0%,#2E9E6E 100%);color:#fff;font-size:11px;font-weight:700;letter-spacing:.02em;box-shadow:0 10px 24px rgba(31,122,84,.18);cursor:${cursor};opacity:${opacity};white-space:nowrap;"
    >${zUiText(ownerReportButtonLabel())}</button>
  `;
}

function ownerReportSyncState() {
  zSetState("state.ui.ownerReportSolicitando", ownerReportSolicitando);
}

function ownerReportRefreshButton() {
  const button = document.getElementById("cart-request-report-btn");
  if (!button) return;
  button.textContent = zUiText(ownerReportButtonLabel());
  button.disabled = ownerReportSolicitando;
  button.style.cursor = ownerReportSolicitando ? "not-allowed" : "pointer";
  button.style.opacity = ownerReportSolicitando ? "0.7" : "1";
}

async function dispararRelatorioDonoManual() {
  if (ownerReportSolicitando) return;
  if (typeof appPodePersistirNoSupabase === "function"
    && !appPodePersistirNoSupabase({ mensagem: "Sem conexao com o Supabase. O resumo diario esta bloqueado no modo consulta." })) {
    return;
  }

  ownerReportSolicitando = true;
  ownerReportSyncState();
  ownerReportRefreshButton();
  if (typeof showToast === "function") {
    showToast(zUiText("⏳"), zUiText("Solicitando o resumo executivo no WhatsApp dos donos..."));
  }

  try {
    const result = await ownerReportInvoke({
      mode: "send",
      triggerReason: "manual",
      requestedByUserId: usuarioLogado && usuarioLogado.id ? usuarioLogado.id : null,
      requestedByName: usuarioLogado && usuarioLogado.nome ? usuarioLogado.nome : "Sistema",
    });
    const summary = result && result.summary ? result.summary : {};
    const sent = Number(summary.sent || 0);
    const failed = Number(summary.failed || 0);
    const skipped = Number(summary.skipped || 0);

    if (typeof showToast === "function") {
      if (sent > 0 && failed === 0) {
        showToast(zUiText("✅"), zUiText(`Resumo enviado para ${sent} dono(s) ativo(s).`));
      } else if (sent > 0) {
        showToast(zUiText("⚠️"), zUiText(`Resumo enviado para ${sent} dono(s), mas ${failed + skipped} registro(s) precisaram de atencao.`));
      } else {
        showToast(zUiText("⚠️"), zUiText("O resumo foi processado, mas nenhum envio foi concluido. Confira os donos ativos e os telefones cadastrados."));
      }
    }
  } catch (error) {
    console.error("Falha ao solicitar relatorio do dono:", error);
    if (typeof showToast === "function") {
      showToast(zUiText("❌"), zUiText(error && error.message ? error.message : "Nao foi possivel solicitar o resumo executivo agora."));
    }
  } finally {
    ownerReportSolicitando = false;
    ownerReportSyncState();
    ownerReportRefreshButton();
  }
}

ownerReportSyncState();

window.ownerReportButtonHtml = ownerReportButtonHtml;
window.dispararRelatorioDonoManual = dispararRelatorioDonoManual;

zRegisterModule("ownerReport", {
  dispararRelatorioDonoManual,
  ownerReportButtonHtml,
});
