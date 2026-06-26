import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', redirect: '/feed' },
        { path: 'feed', name: 'feed', component: () => import('@/views/FeedView.vue') },
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/MessagesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'messages/:id',
          name: 'conversation',
          component: () => import('@/views/MessagesView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/views/NotificationsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'profile/edit',
          name: 'profile-edit',
          component: () => import('@/views/ProfileEditView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '@:username/p/:postId',
          name: 'profile-post',
          component: () => import('@/views/ProfilePostsView.vue'),
        },
        {
          path: '@:username/posts',
          name: 'profile-posts',
          component: () => import('@/views/ProfilePostsView.vue'),
        },
        { path: '@:username', name: 'profile', component: () => import('@/views/ProfileView.vue') },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'feed' };
  }
});

export default router;
