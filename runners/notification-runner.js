addEventListener('notificationPoll', async (resolve, reject, args) => {
  try {
    if (args && args.notificationToken) {
      CapacitorKV.set('autoDoorNotificationPollToken', args.notificationToken);
    } else if (args && args.notificationToken === null) {
      CapacitorKV.remove('autoDoorNotificationPollToken');
    }
    if (args && args.mobileDeviceId) {
      CapacitorKV.set('autoDoorNotificationMobileDeviceId', args.mobileDeviceId);
    } else if (args && args.mobileDeviceId === null) {
      CapacitorKV.remove('autoDoorNotificationMobileDeviceId');
    }
    if (args && args.apiBaseUrl) {
      CapacitorKV.set('autoDoorNotificationApiBaseUrl', args.apiBaseUrl);
    }

    const tokenResult = CapacitorKV.get('autoDoorNotificationPollToken');
    const mobileDeviceIdResult = CapacitorKV.get('autoDoorNotificationMobileDeviceId');
    const apiBaseUrlResult = CapacitorKV.get('autoDoorNotificationApiBaseUrl');
    const token = tokenResult && tokenResult.value;
    const mobileDeviceId = mobileDeviceIdResult && mobileDeviceIdResult.value;
    const apiBaseUrl = apiBaseUrlResult && apiBaseUrlResult.value;

    if (!token || !mobileDeviceId || !apiBaseUrl) {
      resolve();
      return;
    }

    const response = await fetch(`${apiBaseUrl}/api/rest/notifications/mobile-devices/${mobileDeviceId}/poll`, {
      method: 'POST',
      headers: {
        'X-Notification-Token': token,
      },
    });
    if (!response.ok) {
      resolve();
      return;
    }

    const result = await response.json();
    const notifications = result && Array.isArray(result.data) ? result.data : [];
    for (const notification of notifications) {
      CapacitorNotifications.schedule([
        {
          id: Number(notification.id || Date.now()) % 2147483647,
          title: notification.title || '通知',
          body: String(notification.mobileContent || notification.content || '')
            .replace(/\{(?:device|user):#\d+(?:\|([^}]*))?}/g, '$1'),
        },
      ]);
    }
    resolve();
  } catch (error) {
    reject(error);
  }
});
