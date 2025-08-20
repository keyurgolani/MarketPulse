/**
 * Dashboard Sharing Modal Component
 * Provides UI for sharing dashboards via links and user permissions
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Dashboard } from '@/types/dashboard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { logger } from '@/utils/logger';

export interface SharingModalProps {
  /** Dashboard to share */
  dashboard: Dashboard;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when sharing is updated */
  onSharingUpdated?: () => void;
}

interface ShareToken {
  id: string;
  token: string;
  permissions: 'view' | 'edit';
  expiresAt: string | null;
  maxAccessCount: number | null;
  accessCount: number;
  isActive: boolean;
  createdAt: string;
  shareUrl: string;
}

interface UserPermission {
  id: string;
  userId: string;
  permission: 'view' | 'edit' | 'admin';
  grantedBy: string;
  grantedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface SharingState {
  activeTab: 'links' | 'users' | 'embed';
  shareTokens: ShareToken[];
  userPermissions: UserPermission[];
  isLoading: boolean;
  error: string | null;
  // New share token form
  newTokenPermissions: 'view' | 'edit';
  newTokenExpiresAt: string;
  newTokenMaxAccess: string;
  // New user permission form
  newUserEmail: string;
  newUserPermission: 'view' | 'edit' | 'admin';
  newUserExpiresAt: string;
  // Embed options
  embedWidth: string;
  embedHeight: string;
  embedTheme: 'light' | 'dark' | 'auto';
  embedShowHeader: boolean;
  embedShowControls: boolean;
  embedCode: string;
}

export const SharingModal: React.FC<SharingModalProps> = ({
  dashboard,
  isOpen,
  onClose,
  onSharingUpdated,
}) => {
  const [state, setState] = useState<SharingState>({
    activeTab: 'links',
    shareTokens: [],
    userPermissions: [],
    isLoading: false,
    error: null,
    newTokenPermissions: 'view',
    newTokenExpiresAt: '',
    newTokenMaxAccess: '',
    newUserEmail: '',
    newUserPermission: 'view',
    newUserExpiresAt: '',
    embedWidth: '800',
    embedHeight: '600',
    embedTheme: 'auto',
    embedShowHeader: true,
    embedShowControls: false,
    embedCode: '',
  });

  const loadSharingData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [tokensResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/dashboards/${dashboard.id}/share`),
        fetch(`/api/dashboards/${dashboard.id}/permissions`),
      ]);

      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        setState(prev => ({
          ...prev,
          shareTokens: tokensData.data?.tokens || [],
        }));
      }

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setState(prev => ({
          ...prev,
          userPermissions: permissionsData.data?.permissions || [],
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load sharing data';
      setState(prev => ({ ...prev, error: errorMessage }));
      logger.error('Error loading sharing data', { error: errorMessage });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [dashboard.id]);

  // Load sharing data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSharingData();
    }
  }, [isOpen, dashboard.id, loadSharingData]);

  // Create share token
  const createShareToken = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const requestBody: Record<string, unknown> = {
        permissions: state.newTokenPermissions,
      };

      if (state.newTokenExpiresAt) {
        requestBody.expiresAt = new Date(state.newTokenExpiresAt).toISOString();
      }

      if (state.newTokenMaxAccess) {
        requestBody.maxAccessCount = parseInt(state.newTokenMaxAccess, 10);
      }

      const response = await fetch(`/api/dashboards/${dashboard.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const newToken: ShareToken = {
          id: data.data.token.id,
          token: data.data.token.token,
          permissions: data.data.token.permissions,
          expiresAt: data.data.token.expires_at,
          maxAccessCount: data.data.token.max_access_count,
          accessCount: data.data.token.access_count,
          isActive: data.data.token.is_active,
          createdAt: data.data.token.created_at,
          shareUrl: data.data.shareUrl,
        };

        setState(prev => ({
          ...prev,
          shareTokens: [...prev.shareTokens, newToken],
          newTokenPermissions: 'view',
          newTokenExpiresAt: '',
          newTokenMaxAccess: '',
        }));

        onSharingUpdated?.();
        logger.info('Share token created successfully', {
          tokenId: newToken.id,
        });
      } else {
        const errorData = await response.json();
        setState(prev => ({
          ...prev,
          error: errorData.error || 'Failed to create share token',
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create share token';
      setState(prev => ({ ...prev, error: errorMessage }));
      logger.error('Error creating share token', { error: errorMessage });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [
    dashboard.id,
    state.newTokenPermissions,
    state.newTokenExpiresAt,
    state.newTokenMaxAccess,
    onSharingUpdated,
  ]);

  // Revoke share token
  const revokeShareToken = useCallback(
    async (tokenId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/dashboards/${dashboard.id}/share/${tokenId}`,
          {
            method: 'DELETE',
          }
        );

        if (response.ok) {
          setState(prev => ({
            ...prev,
            shareTokens: prev.shareTokens.filter(token => token.id !== tokenId),
          }));

          onSharingUpdated?.();
          logger.info('Share token revoked successfully', { tokenId });
        } else {
          const errorData = await response.json();
          setState(prev => ({
            ...prev,
            error: errorData.error || 'Failed to revoke share token',
          }));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to revoke share token';
        setState(prev => ({ ...prev, error: errorMessage }));
        logger.error('Error revoking share token', { error: errorMessage });
      }
    },
    [dashboard.id, onSharingUpdated]
  );

  // Grant user permission
  const grantUserPermission = useCallback(async (): Promise<void> => {
    if (!state.newUserEmail.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const requestBody: Record<string, unknown> = {
        userId: state.newUserEmail,
        permission: state.newUserPermission,
      };

      if (state.newUserExpiresAt) {
        requestBody.expiresAt = new Date(state.newUserExpiresAt).toISOString();
      }

      const response = await fetch(
        `/api/dashboards/${dashboard.id}/permissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newPermission: UserPermission = {
          id: data.data.permission.id,
          userId: data.data.permission.user_id,
          permission: data.data.permission.permission,
          grantedBy: data.data.permission.granted_by,
          grantedAt: data.data.permission.granted_at,
          expiresAt: data.data.permission.expires_at,
          isActive: data.data.permission.is_active,
        };

        setState(prev => ({
          ...prev,
          userPermissions: [...prev.userPermissions, newPermission],
          newUserEmail: '',
          newUserPermission: 'view',
          newUserExpiresAt: '',
        }));

        onSharingUpdated?.();
        logger.info('User permission granted successfully', {
          userId: newPermission.userId,
        });
      } else {
        const errorData = await response.json();
        setState(prev => ({
          ...prev,
          error: errorData.error || 'Failed to grant user permission',
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to grant user permission';
      setState(prev => ({ ...prev, error: errorMessage }));
      logger.error('Error granting user permission', { error: errorMessage });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [
    dashboard.id,
    state.newUserEmail,
    state.newUserPermission,
    state.newUserExpiresAt,
    onSharingUpdated,
  ]);

  // Revoke user permission
  const revokeUserPermission = useCallback(
    async (userId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/dashboards/${dashboard.id}/permissions/${userId}`,
          {
            method: 'DELETE',
          }
        );

        if (response.ok) {
          setState(prev => ({
            ...prev,
            userPermissions: prev.userPermissions.filter(
              perm => perm.userId !== userId
            ),
          }));

          onSharingUpdated?.();
          logger.info('User permission revoked successfully', { userId });
        } else {
          const errorData = await response.json();
          setState(prev => ({
            ...prev,
            error: errorData.error || 'Failed to revoke user permission',
          }));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to revoke user permission';
        setState(prev => ({ ...prev, error: errorMessage }));
        logger.error('Error revoking user permission', { error: errorMessage });
      }
    },
    [dashboard.id, onSharingUpdated]
  );

  // Generate embed code
  const generateEmbedCode = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({
        width: state.embedWidth,
        height: state.embedHeight,
        theme: state.embedTheme,
        showHeader: state.embedShowHeader.toString(),
        showControls: state.embedShowControls.toString(),
      });

      const response = await fetch(
        `/api/dashboards/${dashboard.id}/embed?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          embedCode: data.data.embedCode,
        }));

        logger.info('Embed code generated successfully');
      } else {
        const errorData = await response.json();
        setState(prev => ({
          ...prev,
          error: errorData.error || 'Failed to generate embed code',
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to generate embed code';
      setState(prev => ({ ...prev, error: errorMessage }));
      logger.error('Error generating embed code', { error: errorMessage });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [
    dashboard.id,
    state.embedWidth,
    state.embedHeight,
    state.embedTheme,
    state.embedShowHeader,
    state.embedShowControls,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Share Dashboard: {dashboard.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'links', label: 'Share Links', icon: '🔗' },
            { id: 'users', label: 'User Permissions', icon: '👥' },
            { id: 'embed', label: 'Embed Code', icon: '📋' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  activeTab: tab.id as 'links' | 'users' | 'embed',
                }))
              }
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                state.activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {state.error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                {state.error}
              </p>
            </div>
          )}

          {state.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Loading...
              </span>
            </div>
          ) : (
            <>
              {/* Share Links Tab */}
              {state.activeTab === 'links' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Share Links
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Create secure links to share this dashboard with others.
                    </p>
                  </div>

                  {/* Create New Share Link */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Create New Share Link
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="new-token-permissions"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Permissions
                        </label>
                        <select
                          id="new-token-permissions"
                          value={state.newTokenPermissions}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              newTokenPermissions: e.target.value as
                                | 'view'
                                | 'edit',
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="view">View Only</option>
                          <option value="edit">View & Edit</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="new-token-expires"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Expires At (Optional)
                        </label>
                        <input
                          id="new-token-expires"
                          type="datetime-local"
                          value={state.newTokenExpiresAt}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              newTokenExpiresAt: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new-token-max-access"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Max Uses (Optional)
                        </label>
                        <input
                          id="new-token-max-access"
                          type="number"
                          min="1"
                          value={state.newTokenMaxAccess}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              newTokenMaxAccess: e.target.value,
                            }))
                          }
                          placeholder="Unlimited"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={createShareToken}
                        variant="primary"
                        size="sm"
                        disabled={state.isLoading}
                      >
                        {state.isLoading ? 'Creating...' : 'Create Share Link'}
                      </Button>
                    </div>
                  </div>

                  {/* Existing Share Links */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Active Share Links ({state.shareTokens.length})
                    </h4>
                    {state.shareTokens.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No share links created yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {state.shareTokens.map(token => (
                          <div
                            key={token.id}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded ${
                                    token.permissions === 'edit'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
                                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                                  }`}
                                >
                                  {token.permissions === 'edit'
                                    ? 'Edit'
                                    : 'View'}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Used {token.accessCount} times
                                </span>
                              </div>
                              <button
                                onClick={() => revokeShareToken(token.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Revoke
                              </button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input
                                value={token.shareUrl}
                                readOnly
                                className="flex-1 text-sm"
                              />
                              <Button
                                onClick={() =>
                                  navigator.clipboard.writeText(token.shareUrl)
                                }
                                variant="secondary"
                                size="sm"
                              >
                                Copy
                              </Button>
                            </div>
                            {token.expiresAt && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Expires:{' '}
                                {new Date(token.expiresAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Permissions Tab */}
              {state.activeTab === 'users' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      User Permissions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Grant specific users access to this dashboard.
                    </p>
                  </div>

                  {/* Add User Permission */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Add User Permission
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="new-user-email"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          User Email/ID
                        </label>
                        <input
                          id="new-user-email"
                          type="text"
                          value={state.newUserEmail}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              newUserEmail: e.target.value,
                            }))
                          }
                          placeholder="user@example.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new-user-permission"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Permission Level
                        </label>
                        <select
                          id="new-user-permission"
                          value={state.newUserPermission}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              newUserPermission: e.target.value as
                                | 'view'
                                | 'edit'
                                | 'admin',
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="view">View Only</option>
                          <option value="edit">View & Edit</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="new-user-expires"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Expires At (Optional)
                        </label>
                        <input
                          id="new-user-expires"
                          type="datetime-local"
                          value={state.newUserExpiresAt}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              newUserExpiresAt: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={grantUserPermission}
                        variant="primary"
                        size="sm"
                        disabled={!state.newUserEmail.trim() || state.isLoading}
                      >
                        {state.isLoading ? 'Granting...' : 'Grant Permission'}
                      </Button>
                    </div>
                  </div>

                  {/* Existing User Permissions */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Current User Permissions ({state.userPermissions.length})
                    </h4>
                    {state.userPermissions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No user permissions granted yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {state.userPermissions.map(permission => (
                          <div
                            key={permission.id}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {permission.userId}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Granted:{' '}
                                    {new Date(
                                      permission.grantedAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs rounded ${
                                    permission.permission === 'admin'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                                      : permission.permission === 'edit'
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                                  }`}
                                >
                                  {permission.permission}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  revokeUserPermission(permission.userId)
                                }
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Revoke
                              </button>
                            </div>
                            {permission.expiresAt && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Expires:{' '}
                                {new Date(
                                  permission.expiresAt
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Embed Code Tab */}
              {state.activeTab === 'embed' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Embed Dashboard
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Embed this dashboard in your website or application.
                    </p>
                  </div>

                  {/* Embed Options */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Embed Options
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label
                          htmlFor="embed-width"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Width
                        </label>
                        <input
                          id="embed-width"
                          type="text"
                          value={state.embedWidth}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              embedWidth: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="embed-height"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Height
                        </label>
                        <input
                          id="embed-height"
                          type="text"
                          value={state.embedHeight}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              embedHeight: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="embed-theme"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Theme
                        </label>
                        <select
                          id="embed-theme"
                          value={state.embedTheme}
                          onChange={e =>
                            setState(prev => ({
                              ...prev,
                              embedTheme: e.target.value as
                                | 'light'
                                | 'dark'
                                | 'auto',
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="auto">Auto</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label
                          htmlFor="embed-show-header"
                          className="flex items-center"
                        >
                          <input
                            id="embed-show-header"
                            type="checkbox"
                            checked={state.embedShowHeader}
                            onChange={e =>
                              setState(prev => ({
                                ...prev,
                                embedShowHeader: e.target.checked,
                              }))
                            }
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Show Header
                          </span>
                        </label>
                        <label
                          htmlFor="embed-show-controls"
                          className="flex items-center"
                        >
                          <input
                            id="embed-show-controls"
                            type="checkbox"
                            checked={state.embedShowControls}
                            onChange={e =>
                              setState(prev => ({
                                ...prev,
                                embedShowControls: e.target.checked,
                              }))
                            }
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Show Controls
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={generateEmbedCode}
                        variant="primary"
                        size="sm"
                        disabled={state.isLoading}
                      >
                        {state.isLoading
                          ? 'Generating...'
                          : 'Generate Embed Code'}
                      </Button>
                    </div>
                  </div>

                  {/* Generated Embed Code */}
                  {state.embedCode && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Embed Code
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label
                            htmlFor="embed-code-textarea"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                          >
                            HTML Iframe
                          </label>
                          <div className="relative">
                            <textarea
                              id="embed-code-textarea"
                              value={state.embedCode}
                              readOnly
                              rows={6}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                            />
                            <Button
                              onClick={() =>
                                navigator.clipboard.writeText(state.embedCode)
                              }
                              variant="secondary"
                              size="sm"
                              className="absolute top-2 right-2"
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharingModal;
