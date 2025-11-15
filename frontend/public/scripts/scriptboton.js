document.addEventListener("DOMContentLoaded", () => {
  const datePicker = document.getElementById("datePicker");
  const calendarIcon = document.getElementById("calendarIcon");

  function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  function formatForDateInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const today = new Date();
  const formattedToday = formatDate(today);
  datePicker.setAttribute('placeholder', formattedToday); // Mostrar el formato al principio

  // Si hay un valor guardado, aplicar ese valor
  const storedDate = localStorage.getItem('dateValue');
  if (storedDate) {
    datePicker.value = storedDate;
  }

  datePicker.addEventListener("change", () => {
    const formattedValue = formatDate(datePicker.value);
    localStorage.setItem('dateValue', formattedValue);  // Guardar el valor formateado
    datePicker.setAttribute('placeholder', formattedValue);  // Mostrarlo como placeholder
  });

  calendarIcon.addEventListener("click", () => {
    datePicker.type = 'date';
    datePicker.value = formatForDateInput(today); // Asignar la fecha en formato 'YYYY-MM-DD'
    datePicker.showPicker();
  });

  datePicker.addEventListener("focus", function () {
    this.type = "date";  // Cambiar a 'date' cuando el campo recibe el foco
    if (!this.value) {
      this.value = formatForDateInput(today);  // Establecer el valor con la fecha actual si está vacío
    }
  });

  datePicker.addEventListener("blur", function () {
    if (!this.value) {
      this.type = "text";  // Volver a tipo texto cuando pierde el foco, si no hay valor
      this.setAttribute("placeholder", formattedToday);  // Mostrar el valor inicial
    }
  });

  const storedFormattedDate = localStorage.getItem('dateValue');
  if (storedFormattedDate) {
    datePicker.setAttribute('placeholder', storedFormattedDate); // Mostrar el valor con formato correcto
  }
});
