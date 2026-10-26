const tabs = {
  login: { tab: document.getElementById("tab-login"), form: document.getElementById("form-login") },
  register: { tab: document.getElementById("tab-register"), form: document.getElementById("form-register") },
};

function show(which) {
  for (const [key, { tab, form }] of Object.entries(tabs)) {
    const active = key === which;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active);
    form.hidden = !active;
    form.querySelector(".error").textContent = "";
  }
  tabs[which].form.querySelector("input").focus();
}
tabs.login.tab.addEventListener("click", () => show("login"));
tabs.register.tab.addEventListener("click", () => show("register"));

async function submit(form, url) {
  const error = form.querySelector(".error");
  const button = form.querySelector(".submit");
  error.textContent = "";
  button.disabled = true;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    window.location.href = "/dashboard";
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
  }
}

tabs.login.form.addEventListener("submit", (e) => { e.preventDefault(); submit(e.target, "/api/login"); });
tabs.register.form.addEventListener("submit", (e) => { e.preventDefault(); submit(e.target, "/api/register"); });
