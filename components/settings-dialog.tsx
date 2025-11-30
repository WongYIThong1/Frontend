'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface UserInfo {
  id: string
  username: string
  apikey: string
  discordId: string
  expiresAt: string | null
  daysRemaining: number
  plan: number
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isBindingDiscord, setIsBindingDiscord] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Form states
  const [licenseKey, setLicenseKey] = useState('')
  const [discordId, setDiscordId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Error/Success messages
  const [extendError, setExtendError] = useState('')
  const [extendSuccess, setExtendSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [discordError, setDiscordError] = useState('')
  const [discordSuccess, setDiscordSuccess] = useState('')

  // Fetch user info
  useEffect(() => {
    if (open) {
      fetchUserInfo()
    }
  }, [open])

  const fetchUserInfo = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user information')
      }

      const data = await response.json()
      setUserInfo(data.user)
      setDiscordId(data.user.discordId || '')
    } catch (error) {
      console.error('Error fetching user info:', error)
      toast({
        title: 'Error',
        description: 'Failed to load user information',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyApiKey = async () => {
    if (!userInfo?.apikey) return

    try {
      await navigator.clipboard.writeText(userInfo.apikey)
      setCopied(true)
      toast({
        title: 'Copied',
        description: 'API Key copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: 'Error',
        description: 'Failed to copy API Key',
        variant: 'destructive',
      })
    }
  }

  const handleExtend = async () => {
    if (!licenseKey.trim()) {
      setExtendError('License key is required')
      return
    }

    try {
      setIsExtending(true)
      setExtendError('')
      setExtendSuccess('')

      const response = await fetch('/api/user/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setExtendError(data.error || 'Failed to extend account')
        return
      }

      setExtendSuccess(`Account extended successfully! ${data.daysRemaining} days remaining.`)
      setLicenseKey('')
      await fetchUserInfo()
    } catch (error) {
      console.error('Error extending account:', error)
      setExtendError('An unexpected error occurred')
    } finally {
      setIsExtending(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    try {
      setIsChangingPassword(true)
      setPasswordError('')
      setPasswordSuccess('')

      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPasswordError(data.error || 'Failed to change password')
        return
      }

      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordError('An unexpected error occurred')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleBindDiscord = async () => {
    if (!discordId.trim()) {
      setDiscordError('Discord ID is required')
      return
    }

    try {
      setIsBindingDiscord(true)
      setDiscordError('')
      setDiscordSuccess('')

      const response = await fetch('/api/user/bind-discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ discordId: discordId.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Failed to bind Discord ID')
        return
      }

      setDiscordSuccess('Discord ID bound successfully!')
      await fetchUserInfo()
    } catch (error) {
      console.error('Error binding Discord:', error)
      setDiscordError('An unexpected error occurred')
    } finally {
      setIsBindingDiscord(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account information and preferences
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              <span>Loading...</span>
            </div>
          </div>
        ) : userInfo ? (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Account Information */}
            <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-300">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={userInfo.username} disabled className="bg-secondary" />
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={showApiKey ? (userInfo.apikey || 'No API Key') : (userInfo.apikey ? '•'.repeat(32) : 'No API Key')}
                      disabled
                      className="bg-secondary font-mono text-sm transition-all duration-300"
                      type={showApiKey ? 'text' : 'password'}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      disabled={!userInfo.apikey}
                      className="transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 transition-transform duration-200" />
                      ) : (
                        <Eye className="h-4 w-4 transition-transform duration-200" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyApiKey}
                      disabled={!userInfo.apikey}
                      className="transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500 animate-in zoom-in-50 duration-200" />
                      ) : (
                        <Copy className="h-4 w-4 transition-transform duration-200" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Discord ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={discordId}
                      onChange={(e) => setDiscordId(e.target.value)}
                      placeholder="Enter your Discord ID"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleBindDiscord}
                      disabled={isBindingDiscord || !discordId.trim()}
                      className="transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      {isBindingDiscord ? (
                        <span className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Binding...
                        </span>
                      ) : (
                        userInfo.discordId ? 'Update' : 'Bind'
                      )}
                    </Button>
                  </div>
                  {discordError && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-top-2 fade-in-0 duration-300">{discordError}</p>
                  )}
                  {discordSuccess && (
                    <p className="text-sm text-green-400 animate-in slide-in-from-top-2 fade-in-0 duration-300">{discordSuccess}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Remaining Days</Label>
                  <Input
                    value={userInfo.daysRemaining > 0 ? `${userInfo.daysRemaining} days` : 'Expired'}
                    disabled
                    className="bg-secondary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-300 delay-75">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-400 animate-in slide-in-from-top-2 fade-in-0 duration-300">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-green-400 animate-in slide-in-from-top-2 fade-in-0 duration-300">{passwordSuccess}</p>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {isChangingPassword ? (
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Changing...
                    </span>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Extend Day */}
            <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-300 delay-150">
              <CardHeader>
                <CardTitle>Extend Day</CardTitle>
                <CardDescription>Extend your account using an inactive License Key</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="license-key">License Key</Label>
                  <Input
                    id="license-key"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="Enter inactive license key"
                  />
                </div>

                {extendError && (
                  <p className="text-sm text-red-400 animate-in slide-in-from-top-2 fade-in-0 duration-300">{extendError}</p>
                )}
                {extendSuccess && (
                  <p className="text-sm text-green-400 animate-in slide-in-from-top-2 fade-in-0 duration-300">{extendSuccess}</p>
                )}

                <Button
                  onClick={handleExtend}
                  disabled={isExtending || !licenseKey.trim()}
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {isExtending ? (
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Extending...
                    </span>
                  ) : (
                    'Extend'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Failed to load user information</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

