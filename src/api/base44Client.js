// Drop-in replacement for the Base44-hosted SDK. Keeps the same `base44.*`
// call shape (auth.*, entities.X.*, functions.invoke, integrations.Core.UploadFile,
// agents.*) so the rest of the app didn't need to change file-by-file — only
// the transport underneath changed, from Base44's platform to our own
// Express/Postgres API (see /server).
import { request, setToken, getToken, connectSocket, disconnectSocket, getSocket } from '@/lib/apiClient';

const ENTITY_NAMES = [
  'CartItem',
  'CategoryConfig',
  'ContactRequest',
  'Creator',
  'CreatorProductLink',
  'CustomerReferral',
  'DeliveryAssignment',
  'Favorite',
  'Message',
  'Notification',
  'Order',
  'Product',
  'ProductEvent',
  'ProductLike',
  'ProductShare',
  'ReferralLink',
  'Review',
  'UserBehavior',
  'UserNotification',
];

function makeEntityApi(name) {
  return {
    list: (sort, limit) => request(`/api/entities/${name}/query`, { method: 'POST', body: { sort, limit } }),
    filter: (where, sort, limit) =>
      request(`/api/entities/${name}/query`, { method: 'POST', body: { where, sort, limit } }),
    create: (data) => request(`/api/entities/${name}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/api/entities/${name}/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/api/entities/${name}/${id}`, { method: 'DELETE' }),
    subscribe: (callback) => {
      const socket = connectSocket();
      const eventName = `entity:${name}`;
      socket.on(eventName, callback);
      return () => socket.off(eventName, callback);
    },
  };
}

const entities = {
  User: {
    list: (sort, limit) => request(`/api/users${limit ? `?limit=${limit}` : ''}`),
    // Admin-only: promote/demote a user's role (e.g. to 'delivery').
    update: (id, data) => request(`/api/users/${id}`, { method: 'PATCH', body: data }),
  },
};
for (const name of ENTITY_NAMES) entities[name] = makeEntityApi(name);

export const base44 = {
  auth: {
    isAuthenticated: () => !!getToken(),
    me: () => request('/api/auth/me'),
    updateMe: (patch) => request('/api/auth/me', { method: 'PATCH', body: patch }),
    logout: () => {
      setToken(null);
      disconnectSocket();
    },
    redirectToLogin: (returnUrl) => {
      const target = returnUrl || window.location.href;
      window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
    },
    // Not part of the Base44 SDK surface, but needed by the new Login/Register pages.
    login: async (email, password) => {
      const { token, user } = await request('/api/auth/login', { method: 'POST', body: { email, password } });
      setToken(token);
      return user;
    },
    register: async (email, password, full_name) => {
      const { token, user } = await request('/api/auth/register', {
        method: 'POST',
        body: { email, password, full_name },
      });
      setToken(token);
      return user;
    },
  },
  entities,
  functions: {
    invoke: (name, params) => request(`/api/functions/${name}`, { method: 'POST', body: params || {} }),
  },
  integrations: {
    Core: {
      UploadFile: async ({ file, folder }) => {
        const form = new FormData();
        form.append('file', file);
        if (folder) form.append('folder', folder);
        return request('/api/upload', { method: 'POST', body: form, isForm: true });
      },
    },
  },
  reviews: {
    // Dedicated post-delivery review endpoint (server/src/routes/reviews.js) —
    // enforces one-review-per-order-item, delivered-only, buyer-only rules
    // that don't fit the generic entities CRUD/RLS model.
    submit: (payload) => request('/api/reviews', { method: 'POST', body: payload }),
  },
  orders: {
    // The buyer's only write to their own order (server/src/routes/orders.js):
    // proof of the final 90% payment, accepted only once the order is delivered
    // and the payment has been requested. Orders are admin-write-only otherwise.
    submitFinalPayment: (orderId, screenshots) =>
      request(`/api/orders/${orderId}/final-payment`, { method: 'POST', body: { screenshots } }),
  },
  agents: {
    createConversation: ({ agent_name }) =>
      request(`/api/agents/${agent_name.replace(/_/g, '-')}/conversations`, { method: 'POST' }),
    addMessage: (conversation, { role, content }) =>
      request(`/api/agents/review-insights/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: { role, content },
      }),
    subscribeToConversation: (conversationId, callback) => {
      const socket = connectSocket();
      const handler = (event) => {
        if (event?.data?.id === conversationId) callback({ messages: event.data.messages });
      };
      socket.on('entity:AgentConversation', handler);
      return () => socket.off('entity:AgentConversation', handler);
    },
  },
};

export { getSocket };
