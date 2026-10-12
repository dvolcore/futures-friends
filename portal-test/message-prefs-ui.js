// "Message settings" on /account for a family login (hub/PORTAL_RETIREMENT.md; the database side is family_get_message_prefs /
// family_set_message_prefs, migrations 20261009100000 and 20261020090000): the daily report email, the Futures at Home weekly email and
// text messages, and which age set the weekly message follows. Texts need the family's own consent, recorded with the wording shown
// and the time. English and Spanish (Spanish is a DRAFT until the center's Spanish-speaking teacher reviews it). The person's own row only.

const L = {
  en: { title: 'Message settings', intro: 'Choose what Futures Friends sends you. You can change this any time.',
    daily: 'Email me the evening report about my child', fahEmail: 'Email me Futures at Home (a weekly idea to try together)',
    fahSms: 'Text me Futures at Home (about 3 a week)', phone: 'Mobile number for texts', phoneHelp: '10-digit US mobile number',
    consentHead: 'What you agree to when you turn on texts', consent: 'I agree to the text messages described above.',
    band: 'Ages for Futures at Home', bandAuto: (b) => (b ? `Follow my child's room (${b})` : "Follow my child's room"),
    bands: { twos: 'Twos', threes: 'Threes', prek: 'Pre-K' }, save: 'Save message settings', saved: 'Message settings saved.',
    consentOn: (d) => `Text consent recorded on ${d}.`, needConsent: 'Tick the box to agree to texts.' },
  es: { title: 'Ajustes de mensajes', intro: 'Elija lo que Futures Friends le envía. Puede cambiarlo cuando quiera.',
    daily: 'Envíenme por correo el reporte de la tarde de mi niño', fahEmail: 'Envíenme por correo Futures en casa (una idea semanal para hacer juntos)',
    fahSms: 'Envíenme mensajes de texto de Futures en casa (unos 3 a la semana)', phone: 'Número de celular para los mensajes de texto', phoneHelp: 'Número de celular de EE. UU. de 10 dígitos',
    consentHead: 'A qué da su consentimiento al activar los mensajes de texto (texto en inglés, tal como se guarda)', consent: 'Acepto los mensajes de texto descritos arriba.',
    band: 'Edades para Futures en casa', bandAuto: (b) => (b ? `Seguir el salón de mi niño (${b})` : 'Seguir el salón de mi niño'),
    bands: { twos: 'Dos años', threes: 'Tres años', prek: 'Pre-K' }, save: 'Guardar ajustes de mensajes', saved: 'Ajustes de mensajes guardados.',
    consentOn: (d) => `Consentimiento para mensajes de texto registrado el ${d}.`, needConsent: 'Marque la casilla para aceptar los mensajes de texto.' },
};

export function mountMessagePrefs({ esc, $, rpc, live, getLang, friendly }) {
  const t = () => L[getLang() === 'es' ? 'es' : 'en'];
  const dateOf = (iso) => new Date(iso).toLocaleDateString(getLang() === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  async function card() {
    const x = t();
    const p = await rpc('family_get_message_prefs');
    const bands = Object.entries(x.bands);
    return `<form class="card" id="messagePrefs" novalidate><h2>${esc(x.title)}</h2><p class="small">${esc(x.intro)}</p>
      <label class="choice"><input type="checkbox" name="daily"${p.daily_report_email ? ' checked' : ''}><span>${esc(x.daily)}</span></label>
      <label class="choice"><input type="checkbox" name="fah_email"${p.fah_email ? ' checked' : ''}><span>${esc(x.fahEmail)}</span></label>
      <label class="choice"><input type="checkbox" name="fah_sms"${p.fah_sms ? ' checked' : ''}><span>${esc(x.fahSms)}</span></label>
      <label class="f"><span>${esc(x.phone)} <span class="hint">${esc(x.phoneHelp)}</span></span><input class="i" type="tel" name="phone" autocomplete="tel" maxlength="20" inputmode="tel" value="${esc(p.sms_phone || '')}"></label>
      <p class="small" lang="en" translate="no"><b>${esc(x.consentHead)}</b><br>${esc(p.sms_consent_text || '')}</p>
      <label class="choice"><input type="checkbox" name="consent"${p.fah_sms && p.sms_consent_at ? ' checked' : ''}><span>${esc(x.consent)}</span></label>
      ${p.sms_consent_at ? `<p class="small muted" id="msgConsentOn">${esc(x.consentOn(dateOf(p.sms_consent_at)))}</p>` : ''}
      <label class="f"><span>${esc(x.band)}</span><select class="i" name="band"><option value="">${esc(x.bandAuto(p.suggested_age_band ? x.bands[p.suggested_age_band] : ''))}</option>
        ${bands.map(([k, l]) => `<option value="${esc(k)}"${p.fah_age_band === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <p class="msg" id="msgPrefsMsg" role="status"></p><button class="btn navy" type="submit">${esc(x.save)}</button></form>`;
  }

  function bind() {
    const f = $('#messagePrefs'); if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const x = t(), m = $('#msgPrefsMsg'), fd = new FormData(f), sms = fd.has('fah_sms');
      if (sms && !fd.has('consent')) { m.className = 'msg bad'; m.textContent = x.needConsent; return; }
      try {
        const r = await rpc('family_set_message_prefs', { p_daily_report_email: fd.has('daily'), p_fah_email: fd.has('fah_email'), p_fah_sms: sms,
          p_fah_age_band: fd.get('band') || null, p_sms_phone: sms ? String(fd.get('phone') || '') : null, p_sms_consent: sms && fd.has('consent') });
        m.className = 'msg ok'; m.textContent = x.saved; live(x.saved);
        const on = $('#msgConsentOn');
        if (r?.sms_consent_at && on) on.textContent = x.consentOn(dateOf(r.sms_consent_at));
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    };
  }
  return { card, bind };
}
