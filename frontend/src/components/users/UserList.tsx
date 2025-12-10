/**
 * UserList Component
 *
 * Displays a searchable, filterable list of users with pagination.
 * Includes filters for role, active status, and search functionality.
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
} from 'lucide-react';

import { useUsers } from '@/hooks/useUsers';
import { UserCard } from './UserCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User, UserRole, UserListQuery } from '@/types/user';

const PAGE_SIZES = [10, 20, 50];

/**
 * Sort options for user list
 */
type SortField = 'name' | 'username' | 'role' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

/**
 * UserList component props
 */
interface UserListProps {
  /** Handler for viewing a user */
  onViewUser?: (user: User) => void;
  /** Handler for editing a user */
  onEditUser?: (user: User) => void;
  /** Handler for activating a user */
  onActivateUser?: (user: User) => void;
  /** Handler for deactivating a user */
  onDeactivateUser?: (user: User) => void;
  /** Handler for resetting a user's password */
  onResetPassword?: (user: User) => void;
  /** Handler for resetting a user's MFA */
  onResetMfa?: (user: User) => void;
}

/**
 * UserList Component
 */
export function UserList({
  onViewUser,
  onEditUser,
  onActivateUser,
  onDeactivateUser,
  onResetPassword,
  onResetMfa,
}: UserListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<UserListQuery>({
    limit: 20,
    offset: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sort state (client-side sorting for current page)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    order: 'asc',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute current filters
  const activeFilters = useMemo(() => {
    const result: UserListQuery = {
      ...filters,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };

    if (debouncedSearch.trim()) {
      result.search = debouncedSearch.trim();
    }

    return result;
  }, [filters, debouncedSearch]);

  // Fetch users
  const {
    data: usersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useUsers(activeFilters);

  // Calculate pagination
  const currentPage =
    Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = usersData
    ? Math.ceil(usersData.total / (filters.limit || 20))
    : 0;
  const hasNextPage = usersData
    ? (filters.offset || 0) + (filters.limit || 20) < usersData.total
    : false;
  const hasPrevPage = (filters.offset || 0) > 0;

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.role) count++;
    if (filters.is_active !== undefined) count++;
    return count;
  }, [filters]);

  // Sort users (client-side sorting for current page results)
  const sortedUsers = useMemo(() => {
    if (!usersData?.users) return [];

    const sorted = [...usersData.users];

    sorted.sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortConfig.field) {
        case 'name':
          aValue = `${a.last_name} ${a.first_name}`.toLowerCase();
          bValue = `${b.last_name} ${b.first_name}`.toLowerCase();
          break;
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'created_at':
          aValue = a.created_at;
          bValue = b.created_at;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [usersData?.users, sortConfig]);

  // Handlers
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (newPage - 1) * (prev.limit || 20),
    }));
  };

  const handlePageSizeChange = (newSize: string) => {
    setFilters((prev) => ({
      ...prev,
      limit: parseInt(newSize, 10),
      offset: 0, // Reset to first page
    }));
  };

  const handleFilterChange = (key: keyof UserListQuery, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset to first page when filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      limit: filters.limit,
      offset: 0,
    });
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const handleUserClick = (user: User) => {
    if (onViewUser) {
      onViewUser(user);
    } else {
      navigate(`/admin/users/${user.id}`);
    }
  };

  const handleNewUser = () => {
    navigate('/admin/users/new');
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-') as [SortField, SortOrder];
    setSortConfig({ field, order });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('users.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearch('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filter Toggle */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  {t('users.filters')}
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('users.advanced_filters')}</h4>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                      >
                        {t('users.clear_all')}
                      </Button>
                    )}
                  </div>

                  {/* Role Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('users.role_label')}
                    </label>
                    <Select
                      value={filters.role || ''}
                      onValueChange={(value) =>
                        handleFilterChange(
                          'role',
                          value ? (value as UserRole) : undefined
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('users.role_all')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('users.role_all')}</SelectItem>
                        <SelectItem value="ADMIN">
                          {t('users.roles.admin')}
                        </SelectItem>
                        <SelectItem value="DOCTOR">
                          {t('users.roles.doctor')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('users.status_label')}
                    </label>
                    <Select
                      value={
                        filters.is_active === undefined
                          ? ''
                          : filters.is_active
                            ? 'active'
                            : 'inactive'
                      }
                      onValueChange={(value) =>
                        handleFilterChange(
                          'is_active',
                          value === '' ? undefined : value === 'active'
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('users.status_all')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('users.status_all')}</SelectItem>
                        <SelectItem value="active">
                          {t('users.status.active')}
                        </SelectItem>
                        <SelectItem value="inactive">
                          {t('users.status.inactive')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Selector */}
            <Select
              value={`${sortConfig.field}-${sortConfig.order}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">{t('users.sort.nameAsc')}</SelectItem>
                <SelectItem value="name-desc">
                  {t('users.sort.nameDesc')}
                </SelectItem>
                <SelectItem value="username-asc">
                  {t('users.sort.usernameAsc')}
                </SelectItem>
                <SelectItem value="username-desc">
                  {t('users.sort.usernameDesc')}
                </SelectItem>
                <SelectItem value="role-asc">{t('users.sort.roleAsc')}</SelectItem>
                <SelectItem value="role-desc">
                  {t('users.sort.roleDesc')}
                </SelectItem>
                <SelectItem value="created_at-asc">
                  {t('users.sort.createdAsc')}
                </SelectItem>
                <SelectItem value="created_at-desc">
                  {t('users.sort.createdDesc')}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Page Size Selector */}
            <Select
              value={String(filters.limit || 20)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / {t('users.page')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.role && (
                <Badge variant="secondary">
                  {t('users.role_label')}:{' '}
                  {t(`users.roles.${filters.role.toLowerCase()}`)}
                  <button
                    className="ml-1"
                    onClick={() => handleFilterChange('role', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.is_active !== undefined && (
                <Badge variant="secondary">
                  {t('users.status_label')}:{' '}
                  {t(`users.status.${filters.is_active ? 'active' : 'inactive'}`)}
                  <button
                    className="ml-1"
                    onClick={() => handleFilterChange('is_active', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: filters.limit || 20 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('users.error_title')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('users.error_loading')}
          </AlertDescription>
          <Button className="mt-4" onClick={() => refetch()}>
            {t('users.retry')}
          </Button>
        </Alert>
      ) : usersData && sortedUsers.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onClick={() => handleUserClick(user)}
                onView={onViewUser ? () => onViewUser(user) : undefined}
                onEdit={onEditUser ? () => onEditUser(user) : undefined}
                onActivate={
                  onActivateUser && !user.is_active
                    ? () => onActivateUser(user)
                    : undefined
                }
                onDeactivate={
                  onDeactivateUser && user.is_active
                    ? () => onDeactivateUser(user)
                    : undefined
                }
                onResetPassword={
                  onResetPassword ? () => onResetPassword(user) : undefined
                }
                onResetMfa={
                  onResetMfa && user.mfa_enabled
                    ? () => onResetMfa(user)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('users.showing_results', {
                  from: (filters.offset || 0) + 1,
                  to: Math.min(
                    (filters.offset || 0) + (filters.limit || 20),
                    usersData.total
                  ),
                  total: usersData.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('users.previous')}
                </Button>
                <span className="text-sm">
                  {t('users.page_of', {
                    current: currentPage,
                    total: totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                >
                  {t('users.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {debouncedSearch || activeFilterCount > 0
                ? t('users.no_results')
                : t('users.no_users')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {debouncedSearch || activeFilterCount > 0
                ? t('users.no_results_description')
                : t('users.no_users_description')}
            </p>
            {debouncedSearch || activeFilterCount > 0 ? (
              <Button variant="outline" onClick={handleClearFilters}>
                {t('users.clear_filters')}
              </Button>
            ) : (
              <Button onClick={handleNewUser}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('users.add_first_user')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
