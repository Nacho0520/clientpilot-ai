const dateTimeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const appointmentFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function fmtDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function fmtAppointment(iso: string): string {
  return appointmentFmt.format(new Date(iso));
}
