import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { User } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { Users, Plus, KeyRound, UserCheck, UserX, Shield, Edit2, AlertTriangle } from 'lucide-react';

export const Employees: React.FC = () => {
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [tempPassword, setTempPassword] = useState('Temp1234');
  const [formError, setFormError] = useState<string | null>(null);

  // Password reset modal
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('Reset1234');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.employees.getAll(),
  });

  const createEmployeeMutation = useMutation({
    mutationFn: () =>
      api.employees.create({
        employeeId: empId,
        name,
        mobile,
        temporaryPassword: tempPassword,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsCreateModalOpen(false);
      setEmpId('');
      setName('');
      setMobile('');
      setTempPassword('Temp1234');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create employee');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.employees.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => {
      if (!resettingUser) throw new Error('No user selected');
      return api.employees.resetPassword(resettingUser.id, newPassword);
    },
    onSuccess: () => {
      alert(`Password for ${resettingUser?.name} reset to "${newPassword}"`);
      setResettingUser(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
            EMPLOYEE MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create employee accounts, reset temporary credentials, and manage operational permissions
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          CREATE EMPLOYEE
        </Button>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-center py-12 text-slate-400 col-span-full">Loading staff accounts...</p>
        ) : employees.length === 0 ? (
          <p className="text-center py-12 text-slate-500 col-span-full">No employee accounts created yet.</p>
        ) : (
          employees.map((emp) => (
            <div
              key={emp.id}
              className="p-5 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-cyber-cyan text-sm tracking-wider">
                    {emp.employeeId}
                  </span>
                  <Badge variant={emp.isActive ? 'available' : 'cancelled'}>
                    {emp.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-white">{emp.name}</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{emp.mobile}</p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Created on {formatDate(emp.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResettingUser(emp);
                    setNewPassword('Reset1234');
                  }}
                  leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                >
                  Reset Pass
                </Button>

                <Button
                  size="sm"
                  variant={emp.isActive ? 'secondary' : 'success'}
                  onClick={() =>
                    toggleStatusMutation.mutate({ id: emp.id, isActive: !emp.isActive })
                  }
                  leftIcon={emp.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                >
                  {emp.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Employee Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Employee"
        subtitle="Generate staff ID, contact info, and temporary password"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createEmployeeMutation.mutate();
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-cyber-red/60 text-cyber-red text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Employee ID *"
            placeholder="e.g. EMP003"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            required
          />

          <Input
            label="Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Mobile Number *"
            placeholder="e.g. +919876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />

          <Input
            label="Temporary Password *"
            placeholder="Temp1234"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createEmployeeMutation.isPending}
            >
              CREATE STAFF ACCOUNT
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        title="Reset Employee Password"
        subtitle={`Set new temporary password for ${resettingUser?.name} (${resettingUser?.employeeId})`}
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resetPasswordMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="New Password *"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setResettingUser(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="magenta"
              isLoading={resetPasswordMutation.isPending}
            >
              SAVE PASSWORD
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
