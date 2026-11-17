import type { AppNotification } from './types'

/**
 * Device (OS-level) notifications: Android/desktop banners, and iOS once the app is
 * added to the Home Screen. Delivered while HIVE Hub is open or running in the
 * background; the in-app notification panel always has the full history.
 */
const PREF_KEY = 'hive.deviceAlerts'

export const deviceAlertsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export const devicePermission = (): NotificationPermission | 'unsupported' =>
  deviceAlertsSupported() ? Notification.permission : 'unsupported'

export function deviceAlertsOn(): boolean {
  if (devicePermission() !== 'granted') return false
  try {
    return localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setDeviceAlertsPref(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable: default stays on */
  }
}

/** Asks the browser for permission (must be called from a click). Returns whether alerts are now on. */
export async function enableDeviceAlerts(): Promise<boolean> {
  if (!deviceAlertsSupported()) return false
  const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (result !== 'granted') return false
  setDeviceAlertsPref(true)
  return true
}

/** Where a notification should take you: the task, opening its chat tab for chat messages. */
export const taskUrl = (n: Pick<AppNotification, 'taskId' | 'kind'>) =>
  n.taskId ? `/tasks?task=${n.taskId}${n.kind === 'chat' ? '&tab=chat' : ''}` : '/tasks'

export async function showDeviceNotification(n: AppNotification) {
  if (!deviceAlertsOn()) return
  // The person is looking at the app right now: the in-app toast and bell are enough.
  if (document.visibilityState === 'visible' && document.hasFocus()) return
  const options: NotificationOptions & { renotify?: boolean } = {
    body: n.body,
    tag: n.id,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: { url: taskUrl(n) },
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) return await reg.showNotification(n.title, options)
    const note = new Notification(n.title, options)
    note.onclick = () => {
      window.focus()
      window.location.assign(taskUrl(n))
      note.close()
    }
  } catch {
    /* notification could not be shown; the panel still has it */
  }
}
