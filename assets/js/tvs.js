/* TVS Perú · propuesta de rediseño DataLab. Sin dependencias. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.dataLayer = window.dataLayer || [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  /* ------------------------------------------------------------ avisos */
  var toast = $("#toast"), toastTimer;
  function avisar(html, ms) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.className = "toast";
    toast.innerHTML = html + '<button class="toast-cerrar" type="button" aria-label="Cerrar aviso">×</button>';
    toast.hidden = false;
    toastTimer = setTimeout(function () { toast.hidden = true; }, ms || 7000);
  }
  if (toast) toast.addEventListener("click", function (ev) { if (ev.target.closest(".toast-cerrar")) toast.hidden = true; });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && toast) toast.hidden = true; });

  /* Medición: los eventos van a dataLayer (GA4 / Tag Manager) sin mostrar nada al visitante. */
  function medir(evento, datos) { window.dataLayer.push(Object.assign({ event: evento }, datos || {})); }

  document.addEventListener("click", function (ev) {
    var demo = ev.target.closest("[data-demo]");
    if (demo) {
      ev.preventDefault();
      var enlace = demo.getAttribute("data-demo-enlace");
      avisar("<strong>" + esc(demo.getAttribute("data-demo")) + "</strong>" +
        esc(demo.getAttribute("data-demo-texto") || "Esta página forma parte del sitio final.") +
        " La demo incluye el inicio, la ficha de la Apache RTR 160 y el localizador." +
        (enlace ? ' <a href="' + esc(enlace) + '">Ver la ficha de ejemplo</a>' : ""));
      return;
    }
    var llegar = ev.target.closest("[data-llegar]");
    if (llegar) {
      var tarjeta = llegar.closest("[data-punto]");
      medir("como_llegar", { punto: tarjeta ? tarjeta.getAttribute("data-nombre") : "" });
    }
    var wa = ev.target.closest('a[href^="https://wa.me/"]');
    if (wa) medir("click_whatsapp", { ubicacion: wa.className || "enlace" });
  });

  /* ------------------------------------------------------------ menú móvil */
  var cabecera = $("[data-cabecera]");
  var botonMenu = $(".nav-boton");
  if (cabecera && botonMenu) {
    botonMenu.addEventListener("click", function () {
      var abierta = cabecera.classList.toggle("abierta");
      botonMenu.setAttribute("aria-expanded", abierta);
      botonMenu.setAttribute("aria-label", abierta ? "Cerrar menú" : "Abrir menú");
    });
    $$("#nav-principal a").forEach(function (a) {
      a.addEventListener("click", function () {
        cabecera.classList.remove("abierta");
        botonMenu.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ------------------------------------------------------------ tarjeta de punto (ficha y localizador) */
  var TIPO_LINEA = { motos: "Motos", mototaxis: "Mototaxis" };
  function tarjetaPunto(p, op) {
    op = op || {};
    var li = document.createElement("li");
    li.className = "punto";
    li.id = (op.prefijo || "") + p.id;
    li.setAttribute("data-punto", p.id);
    li.setAttribute("data-nombre", p.n);
    var tags = (p.s.indexOf("venta") > -1 ? '<li class="tag tag-venta">Venta</li>' : "") +
      (p.s.indexOf("taller") > -1 ? '<li class="tag tag-taller">Taller</li>' : "") +
      p.l.map(function (l) { return '<li class="tag">' + TIPO_LINEA[l] + "</li>"; }).join("");
    var ver = op.verEnlace
      ? '<a class="btn btn-borde btn-sm" href="' + esc(op.verEnlace + "?punto=" + p.id) + '">Ver en el mapa</a>'
      : '<button class="btn btn-borde btn-sm" type="button" data-ver-mapa>Ver en el mapa</button>';
    li.innerHTML =
      '<p class="punto-tipo">' + esc(p.t) + "</p>" +
      '<h3 class="punto-nombre">' + esc(p.n) + "</h3>" +
      '<p class="punto-dir">' + esc(p.d) + (p.r ? '<span class="punto-ref">Ref.: ' + esc(p.r) + "</span>" : "") +
      '<span class="punto-lugar">' + esc(p.di) + ", " + esc(p.de) + "</span></p>" +
      '<ul class="punto-tags">' + tags + "</ul>" +
      (p.ap ? '<p class="punto-aprox">Ubicación aproximada: se valida con el Excel maestro.</p>' : "") +
      (p._km != null ? '<p class="punto-distancia">A ' + formatoKm(p._km) + " de ti</p>" : "") +
      '<div class="punto-acciones"><a class="btn btn-azul btn-sm" href="https://www.google.com/maps/dir/?api=1&amp;destination=' +
      p.lat + "," + p.lng + '" target="_blank" rel="noopener" data-llegar>Cómo llegar</a>' + ver + "</div>";
    return li;
  }
  function formatoKm(k) { return k < 1 ? Math.round(k * 1000) + " m" : (k < 10 ? k.toFixed(1) : Math.round(k)) + " km"; }
  function distancia(a, b) {
    var r = 6371, rad = Math.PI / 180;
    var dLa = (b.lat - a.lat) * rad, dLo = (b.lng - a.lng) * rad;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * r * Math.asin(Math.sqrt(h));
  }
  window.TVSUI = { tarjetaPunto: tarjetaPunto, distancia: distancia, formatoKm: formatoKm, avisar: avisar, medir: medir, norm: norm, esc: esc };

  /* ------------------------------------------------------------ héroe: Motos / Mototaxis */
  var heroe = $("[data-heroe]");
  if (heroe) {
    var palabra = $("[data-palabra]", heroe);
    var botones = $$("[data-linea]", heroe);
    var precargar = function () {
      var img = $('[data-vehiculo="mototaxis"] img', heroe);
      if (img && img.loading === "lazy") img.loading = "eager";
    };
    botones.forEach(function (b) {
      b.addEventListener("pointerenter", precargar);
      b.addEventListener("focus", precargar);
      b.addEventListener("click", function () {
        if (b.getAttribute("aria-pressed") === "true") return;
        var linea = b.getAttribute("data-linea");
        botones.forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        var sale = $(".heroe-vehiculo.es-activo", heroe);
        var entra = $('[data-vehiculo="' + linea + '"]', heroe);
        var img = $("img", entra);
        precargar();
        var mostrar = function () {
          if (sale) { sale.classList.remove("es-activo"); sale.hidden = true; sale.classList.remove("sale"); }
          entra.hidden = false;
          void entra.offsetWidth;
          entra.classList.add("es-activo");
          palabra.textContent = linea === "motos" ? "APACHE" : "KING";
          palabra.classList.remove("cambia"); void palabra.offsetWidth; palabra.classList.add("cambia");
          $$("[data-ficha]", heroe).forEach(function (f) { f.hidden = f.getAttribute("data-ficha") !== linea; });
        };
        var listo = img && img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        if (sale && !reducido) {
          sale.classList.add("sale");
          Promise.all([listo, new Promise(function (r) { setTimeout(r, 380); })]).then(mostrar);
        } else { listo.then(mostrar); }
      });
    });
  }

  /* ------------------------------------------------------------ catálogo por uso */
  var catalogo = $("[data-modelos]");
  var chips = $$(".chip[data-ver]");
  var estadoCatalogo = $("[data-catalogo-estado]");
  var NOMBRES_VER = { motos: "motos lineales", mototaxis: "mototaxis" };
  function filtrar(ver, desplazar) {
    if (!catalogo) return false;
    var tarjetas = $$(".modelo", catalogo);
    var aplicar = function () {
      var n = 0;
      tarjetas.forEach(function (li) {
        var ok = ver === "todos" || li.getAttribute("data-linea") === ver || li.getAttribute("data-uso") === ver;
        li.hidden = !ok;
        if (ok) n++;
      });
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-ver") === ver); });
      if (estadoCatalogo) {
        var chip = chips.filter(function (c) { return c.getAttribute("data-ver") === ver; })[0];
        var etiqueta = NOMBRES_VER[ver] || (chip ? chip.firstChild.textContent.trim().toLowerCase() : "");
        estadoCatalogo.textContent = ver === "todos" ? "Mostrando los " + n + " modelos"
          : "Mostrando " + n + (n === 1 ? " modelo" : " modelos") + " · " + etiqueta;
      }
    };
    var hecho = false;
    var unaVez = function () { if (!hecho) { hecho = true; aplicar(); } };
    if (document.startViewTransition && !reducido && !desplazar && document.visibilityState === "visible") {
      document.startViewTransition(unaVez);
      setTimeout(unaVez, 300);  // respaldo si el navegador no llega a pintar la transición
    } else unaVez();
    if (desplazar) $("#modelos").scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
    var url = new URL(location.href);
    if (ver === "todos") url.searchParams.delete("ver"); else url.searchParams.set("ver", ver);
    history.replaceState(null, "", url.pathname + url.search + "#modelos");
    return true;
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { filtrar(c.getAttribute("data-ver"), false); }); });
  $$("[data-filtro]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      if (catalogo) { ev.preventDefault(); filtrar(a.getAttribute("data-filtro"), true); }
    });
  });
  if (catalogo) {
    var ver = new URLSearchParams(location.search).get("ver");
    if (ver && chips.some(function (c) { return c.getAttribute("data-ver") === ver; })) filtrar(ver, false);
  }

  /* ------------------------------------------------------------ comparativa: oculta hasta «Ver comparativa» */
  var panelComp = $("[data-comparativa-panel]");
  if (panelComp) {
    var botonesComp = $$("[data-comparativa]");
    var tituloComp = $("#comparativa-titulo");
    var origenComp = null;
    var marcarComp = function (abierta) {
      botonesComp.forEach(function (b) {
        b.setAttribute("aria-expanded", abierta ? "true" : "false");
        var t = $("[data-comparativa-texto]", b);
        if (!t) return;
        if (!t.getAttribute("data-original")) t.setAttribute("data-original", t.textContent);
        t.textContent = abierta ? "Ocultar comparativa" : t.getAttribute("data-original");
      });
    };
    var abrirComp = function (desplazar) {
      var cerrada = panelComp.hasAttribute("hidden");
      if (cerrada) {
        panelComp.removeAttribute("hidden");
        marcarComp(true);
        medir("ver_comparativa", {});
      }
      // primero el desplazamiento y después la animación: si no, el destino se calcula con el panel aún corrido 18 px
      if (desplazar) {
        tituloComp.focus({ preventScroll: true });
        tituloComp.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
      }
      if (cerrada && !reducido) { panelComp.classList.remove("entra"); void panelComp.offsetWidth; panelComp.classList.add("entra"); }
    };
    var cerrarComp = function () {
      panelComp.setAttribute("hidden", "until-found");
      marcarComp(false);
      // vuelve al botón con que se abrió (o a la tarjeta «Compáralas») para no dejar a la persona en otra sección
      // (en celular, el botón bajo el carrusel; en escritorio, la tarjeta)
      var volver = origenComp && origenComp.offsetParent ? origenComp : botonesComp.filter(function (b) { return b.offsetParent; }).pop();
      if (volver) {
        volver.focus({ preventScroll: true });
        volver.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "nearest" });
      }
    };
    botonesComp.forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        origenComp = b;
        if (panelComp.hasAttribute("hidden")) abrirComp(true); else cerrarComp();
      });
    });
    var cerrarBtnComp = $("[data-comparativa-cerrar]");
    if (cerrarBtnComp) cerrarBtnComp.addEventListener("click", cerrarComp);
    // Chrome la abre solo con Ctrl+F o con un enlace a #comparativa (hidden=until-found): aquí solo se sincronizan los botones
    panelComp.addEventListener("beforematch", function () { marcarComp(true); });
    if (/^#comparativa(-titulo)?$/.test(location.hash)) abrirComp(true);
  }

  /* ------------------------------------------------------------ red de puntos: aparecen al llegar */
  var mapaRed = $(".red-mapa");
  if (mapaRed) {
    if ("IntersectionObserver" in window && !reducido) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { mapaRed.classList.add("visible"); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(mapaRed);
    } else mapaRed.classList.add("visible");
    var redForm = $(".red-buscar");
    if (redForm) redForm.addEventListener("submit", function () {
      medir("buscar_punto", { departamento: $("#red-dep").value || "Todo el Perú" });
    });
  }

  /* ------------------------------------------------------------ cotizador */
  var form = $("#form-cotizar");
  if (form) {
    var D = window.TVS || { modelos: [], sugeridos: {} };
    var campos = {
      nombre: $("#f-nombre"), celular: $("#f-celular"), correo: $("#f-correo"),
      dep: $("#f-dep"), modelo: $("#f-modelo"), pago: $("#f-pago"), acepto: $("#f-acepto")
    };
    var sugeridoEl = $("[data-sugerido]");
    var sugeridoBase = sugeridoEl ? sugeridoEl.textContent : "";
    var modelo = function (n) { return D.modelos.filter(function (m) { return m.n === n; })[0]; };
    var digitos = function () { return campos.celular.value.replace(/\D/g, "").slice(0, 9); };
    function sugerido() {
      var m = modelo(campos.modelo.value);
      var dep = campos.dep.value;
      return dep && D.sugeridos[dep] ? D.sugeridos[dep][m ? m.l : "motos"] : "";
    }
    function actualizar() {
      var s = sugerido();
      if (sugeridoEl) {
        sugeridoEl.textContent = s || sugeridoBase;
        sugeridoEl.classList.toggle("es-real", !!s);
      }
      return s;
    }
    campos.celular.addEventListener("input", function () {
      var d = digitos();
      campos.celular.value = d.replace(/(\d{3})(\d{0,3})(\d{0,3})/, function (_, a, b, c) { return [a, b, c].filter(Boolean).join(" "); });
    });
    ["input", "change"].forEach(function (t) { form.addEventListener(t, function (ev) { actualizar(); limpiarError(ev.target); }); });
    actualizar();

    function campoDe(el) { return el.closest(".campo"); }
    function limpiarError(el) {
      if (!el || !el.closest) return;
      var c = campoDe(el);
      if (c && c.classList.contains("con-error") && valido(el)) { c.classList.remove("con-error"); el.removeAttribute("aria-invalid"); }
      if (el === campos.acepto && el.checked) $("#f-acepto-error").classList.remove("visible");
    }
    function valido(el) {
      if (el === campos.nombre) return el.value.trim().length >= 3;
      if (el === campos.celular) return /^9\d{8}$/.test(digitos());
      if (el === campos.correo) return !el.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());  // opcional
      if (el === campos.acepto) return el.checked;
      return !!el.value;
    }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var primero = null;
      [campos.nombre, campos.celular, campos.correo, campos.dep, campos.modelo, campos.pago].forEach(function (el) {
        var ok = valido(el);
        campoDe(el).classList.toggle("con-error", !ok);
        if (!ok) { el.setAttribute("aria-invalid", "true"); primero = primero || el; } else el.removeAttribute("aria-invalid");
      });
      var okAcepto = valido(campos.acepto);
      $("#f-acepto-error").classList.toggle("visible", !okAcepto);
      if (!okAcepto) primero = primero || campos.acepto;
      if (primero) { primero.focus(); return; }
      var tienda = actualizar();
      var m = modelo(campos.modelo.value);
      medir("generate_lead", { modelo: m ? m.n : "", departamento: campos.dep.value, origen: form.getAttribute("data-origen") });
      $("[data-ok-nombre]", form).textContent = campos.nombre.value.trim().split(" ")[0];
      $("[data-ok-tienda]", form).textContent = tienda || "tu concesionario más cercano";
      form.classList.add("enviado");
      var ok = $(".form-ok", form); ok.hidden = false; ok.focus();
    });
    $("[data-reiniciar]", form).addEventListener("click", function () {
      form.reset();
      if (form.getAttribute("data-modelo")) campos.modelo.value = form.getAttribute("data-modelo");
      form.classList.remove("enviado");
      $(".form-ok", form).hidden = true;
      actualizar(); campos.nombre.focus();
    });
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-cotizar]");
      if (!b) return;
      ev.preventDefault();
      campos.modelo.value = b.getAttribute("data-cotizar");
      actualizar();
      $("#cotizar").scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
      setTimeout(function () { (campos.nombre.value ? campos.dep : campos.nombre).focus({ preventScroll: true }); }, reducido ? 0 : 650);
    });
  }

  /* ------------------------------------------------------------ ficha: colores, secciones, galería y dónde comprar */
  var colores = $$(".colores [data-color]");
  if (colores.length) {
    var nombreColor = $("[data-color-nombre]");
    var elegir = function (b, foco) {
      var c = b.getAttribute("data-color");
      colores.forEach(function (x) { x.setAttribute("aria-checked", x === b); x.tabIndex = x === b ? 0 : -1; });
      $$("[data-color-img]").forEach(function (img) {
        var activo = img.getAttribute("data-color-img") === c;
        if (activo && img.hidden) { img.hidden = false; img.classList.remove("entra"); void img.offsetWidth; img.classList.add("entra"); }
        else if (!activo) img.hidden = true;
      });
      if (nombreColor) nombreColor.textContent = b.textContent.trim().toLowerCase();
      if (foco) b.focus();
    };
    colores.forEach(function (b, i) {
      b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
      b.addEventListener("click", function () { elegir(b); });
      b.addEventListener("keydown", function (ev) {
        var paso = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
        if (!paso) return;
        ev.preventDefault();
        elegir(colores[(i + paso + colores.length) % colores.length], true);
      });
      b.addEventListener("pointerenter", function () {
        var img = $('[data-color-img="' + b.getAttribute("data-color") + '"]');
        if (img && img.loading === "lazy") img.loading = "eager";
      });
    });
  }

  /* El «Cotizar» de la subnavegación solo aparece cuando el botón principal de la ficha ya no se ve (evita duplicar llamados). */
  var ctaFicha = $(".ficha-cta"), subnavBarra = $(".subnav");
  if (ctaFicha && subnavBarra && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      subnavBarra.classList.toggle("con-cta", !es[0].isIntersecting && es[0].boundingClientRect.top < 0);
    }).observe(ctaFicha);
  } else if (subnavBarra) subnavBarra.classList.add("con-cta");

  var subnav = $$(".subnav-in a[href^='#']:not(.btn)");
  if (subnav.length && "IntersectionObserver" in window) {
    var secciones = subnav.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    var ioSec = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        subnav.forEach(function (a) { a.classList.toggle("activo", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    secciones.forEach(function (s) { ioSec.observe(s); });
  }

  var visor = $(".visor");
  if (visor && visor.showModal) {
    var visorImg = document.createElement("img");
    visor.appendChild(visorImg);
    $$(".galeria-item").forEach(function (b) {
      b.addEventListener("click", function () {
        var img = $("img", b);
        visorImg.src = b.getAttribute("data-grande");
        visorImg.alt = img ? img.alt : "";
        visor.showModal();
      });
    });
    visor.addEventListener("click", function (ev) { if (ev.target === visor) visor.close(); });
  }

  var dondeLista = $("[data-donde-lista]");
  if (dondeLista && window.TVS_PUNTOS) {
    var puntos = window.TVS_PUNTOS.filter(function (p) { return p.s.indexOf("venta") > -1 && p.l.indexOf("motos") > -1; });
    var ordenTipo = { "Showroom TVS": 0, "Showroom y taller": 0, "Concesionario y taller": 1, "Concesionario": 2, "Tienda aliada": 3 };
    var rango = function (p) { return p.t in ordenTipo ? ordenTipo[p.t] : 4; };
    var selDep = $("#donde-dep");
    var verEnlace = "../../donde-comprar/";
    var pintar = function (lista) {
      dondeLista.innerHTML = "";
      lista.slice(0, 4).forEach(function (p) { dondeLista.appendChild(tarjetaPunto(p, { verEnlace: verEnlace, prefijo: "d-" })); });
    };
    var porDep = function () {
      var dep = selDep.value;
      pintar(puntos.filter(function (p) { return p.de === dep; }).map(function (p) { p._km = null; return p; })
        .sort(function (a, b) { return rango(a) - rango(b) || a.n.localeCompare(b.n, "es"); }));
    };
    selDep.addEventListener("change", porDep);
    porDep();
    var botonCerca = $("[data-cerca-ficha]");
    if (botonCerca) botonCerca.addEventListener("click", function () {
      if (!navigator.geolocation) { avisar("<strong>Tu navegador no comparte la ubicación.</strong> Elige tu departamento en la lista."); return; }
      botonCerca.disabled = true; botonCerca.textContent = "Buscando…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        var yo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        var cerca = puntos.map(function (p) { p._km = distancia(yo, p); return p; }).sort(function (a, b) { return a._km - b._km; });
        pintar(cerca);
        botonCerca.disabled = false; botonCerca.textContent = "Usar mi ubicación";
        medir("buscar_cerca", { pagina: "ficha" });
      }, function () {
        botonCerca.disabled = false; botonCerca.textContent = "Usar mi ubicación";
        avisar("<strong>No pudimos usar tu ubicación.</strong> Revisa el permiso del navegador o elige tu departamento.");
      }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 });
    });
  }
})();
