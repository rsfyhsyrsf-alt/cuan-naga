
const SUPABASE_URL = "ISI_URL_SUPABASE";
const SUPABASE_KEY = "ISI_ANON_KEY";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let customers = [];

const form = document.getElementById("customerForm");

async function loadCustomers() {
  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Gagal mengambil data: " + error.message);
    return;
  }

  customers = data || [];
  render();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const customer = {
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    status: document.getElementById("status").value,
    schedule: document.getElementById("schedule").value || null,
    note: document.getElementById("note").value.trim()
  };

  const { error } = await db
    .from("customers")
    .insert([customer]);

  if (error) {
    alert(error.message);
    return;
  }

  form.reset();
  await loadCustomers();
});

function render() {
  const list = document.getElementById("customerList");
  const search = document.getElementById("search")
    .value.toLowerCase();

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search) ||
    c.phone.includes(search)
  );

  list.innerHTML = "";

  filtered.forEach(c => {
    const tr = document.createElement("tr");

    const values = [
      c.name,
      c.phone,
      c.status,
      c.schedule || "-"
    ];

    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    const action = document.createElement("td");
    action.className = "action";

    const wa = document.createElement("button");
    wa.className = "whatsapp";
    wa.textContent = "WhatsApp";
    wa.onclick = () => {
      const number = c.phone.replace(/\D/g, "");
      const normalized = number.startsWith("0")
        ? "62" + number.slice(1)
        : number;

      window.open(
        "https://wa.me/" + normalized,
        "_blank"
      );
    };

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.onclick = () => editCustomer(c);

    const del = document.createElement("button");
    del.textContent = "Hapus";
    del.className = "delete";
    del.onclick = () => deleteCustomer(c.id);

    action.append(wa, edit, del);
    tr.appendChild(action);
    list.appendChild(tr);
  });

  document.getElementById("total").textContent =
    customers.length;

  document.getElementById("pending").textContent =
    customers.filter(c => c.status === "Belum Dihubungi").length;

  document.getElementById("followup").textContent =
    customers.filter(c => c.status === "Follow-up").length;

  document.getElementById("done").textContent =
    customers.filter(c => c.status === "Selesai").length;
}

async function editCustomer(c) {
  const name = prompt("Nama customer:", c.name);
  if (name === null) return;

  const phone = prompt("Nomor WhatsApp:", c.phone);
  if (phone === null) return;

  const note = prompt("Catatan:", c.note || "");
  if (note === null) return;

  const { error } = await db
    .from("customers")
    .update({ name, phone, note })
    .eq("id", c.id);

  if (error) {
    alert(error.message);
    return;
  }

  loadCustomers();
}

async function deleteCustomer(id) {
  if (!confirm("Hapus data customer ini?")) return;

  const { error } = await db
    .from("customers")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadCustomers();
}

document.getElementById("search")
  .addEventListener("input", render);

function exportCSV() {
  const rows = [
    ["Nama", "WhatsApp", "Alamat", "Status", "Jadwal", "Catatan"],
    ...customers.map(c => [
      c.name, c.phone, c.address,
      c.status, c.schedule, c.note
    ])
  ];

  const csv = rows.map(row =>
    row.map(v =>
      '"' + String(v ?? "").replace(/"/g, '""') + '"'
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "database-customer.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("excelFile")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.trim().split(/\r?\n/);

    const parsed = rows.slice(1).map(line => {
      const values = line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)
        ?.map(v => v.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) || [];

      return {
        name: values[0] || "",
        phone: values[1] || "",
        address: values[2] || "",
        status: values[3] || "Belum Dihubungi",
        schedule: values[4] || null,
        note: values[5] || ""
      };
    }).filter(c => c.name && c.phone);

    if (!parsed.length) {
      alert("Tidak ada data valid untuk diimport.");
      return;
    }

    const { error } = await db
      .from("customers")
      .insert(parsed);

    if (error) {
      alert(error.message);
      return;
    }

    alert(parsed.length + " customer berhasil diimport.");
    e.target.value = "";
    loadCustomers();
  });

loadCustomers();
