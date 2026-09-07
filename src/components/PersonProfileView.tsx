import { useEffect, useState } from 'react';
import type { Person, Workspace } from '../domain/workspace';
import type { PersonFactProfile, ResidentialAddress } from '../domain/personFacts';
import {
  clearAndSaveFact,
  loadPersonFactProfileForWorkspacePerson,
  updateAndSaveDateOfBirth,
  updateAndSaveEmail,
  updateAndSaveResidentialAddress,
  type LoadPersonFactProfileRuntimeResult
} from '../domain/personFactProfileRuntime';

export interface PersonProfileViewProps {
  readonly workspace: Workspace;
  readonly person: Person;
  readonly onBack: () => void;
  readonly loadProfile?: (workspace: Workspace, personId: string) => Promise<LoadPersonFactProfileRuntimeResult>;
  readonly now?: () => string;
}

function formatConfirmedTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function PersonProfileView({
  workspace,
  person,
  onBack,
  loadProfile = loadPersonFactProfileForWorkspacePerson,
  now
}: PersonProfileViewProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PersonFactProfile | null>(null);

  const [editingFact, setEditingFact] = useState<'dateOfBirth' | 'email' | 'residentialAddress' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form states
  const [dobValue, setDobValue] = useState<string>('');
  const [emailValue, setEmailValue] = useState<string>('');
  const [addressLinesValue, setAddressLinesValue] = useState<string>('');
  const [localityValue, setLocalityValue] = useState<string>('');
  const [regionValue, setRegionValue] = useState<string>('');
  const [postalCodeValue, setPostalCodeValue] = useState<string>('');
  const [countryValue, setCountryValue] = useState<string>('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    loadProfile(workspace, person.personId)
      .then((result) => {
        if (!active) return;
        if (result.kind === 'empty') {
          setProfile(result.profile);
          setLoading(false);
        } else if (result.kind === 'current') {
          setProfile(result.profile);
          setLoading(false);
        } else if (result.kind === 'future') {
          setLoadError(`该人员档案由较新版本创建（版本 ${result.schemaVersion}），当前版本无法查看或修改。`);
          setLoading(false);
        } else if (result.kind === 'invalid') {
          setLoadError(`人员档案数据格式损坏或不符合当前规范，无法安全加载。`);
          setLoading(false);
        } else if (result.kind === 'storage_error') {
          setLoadError(`读取人员档案失败：${result.error}`);
          setLoading(false);
        } else {
          setLoadError(`未在当前工作区中找到人员：${result.error}`);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(`加载档案异常：${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspace, person.personId, loadProfile]);

  const startEditDob = () => {
    setDobValue(profile?.facts.dateOfBirth?.date ?? '');
    setEditingFact('dateOfBirth');
    setActionError(null);
  };

  const startEditEmail = () => {
    setEmailValue(profile?.facts.email?.email ?? '');
    setEditingFact('email');
    setActionError(null);
  };

  const startEditAddress = () => {
    const addr = profile?.facts.residentialAddress?.address;
    setAddressLinesValue(addr?.addressLines ? addr.addressLines.join('\n') : '');
    setLocalityValue(addr?.locality ?? '');
    setRegionValue(addr?.region ?? '');
    setPostalCodeValue(addr?.postalCode ?? '');
    setCountryValue(addr?.countryCodeOrName ?? '');
    setEditingFact('residentialAddress');
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditingFact(null);
    setActionError(null);
  };

  const getConfirmationTimestamp = (): string => {
    return now ? now() : new Date().toISOString();
  };

  const handleSaveDob = async () => {
    if (!profile) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const confirmedAt = getConfirmationTimestamp();
      const result = await updateAndSaveDateOfBirth(workspace, profile, {
        date: dobValue.trim(),
        lastConfirmedAt: confirmedAt
      });
      if (!result.success) {
        setActionError(result.error);
      } else {
        setProfile(result.profile);
        setEditingFact(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDob = async () => {
    if (!profile) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await clearAndSaveFact(workspace, profile, 'dateOfBirth');
      if (!result.success) {
        setActionError(result.error);
      } else {
        setProfile(result.profile);
        if (editingFact === 'dateOfBirth') setEditingFact(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!profile) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const confirmedAt = getConfirmationTimestamp();
      const result = await updateAndSaveEmail(workspace, profile, {
        email: emailValue.trim(),
        lastConfirmedAt: confirmedAt
      });
      if (!result.success) {
        setActionError(result.error);
      } else {
        setProfile(result.profile);
        setEditingFact(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearEmail = async () => {
    if (!profile) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await clearAndSaveFact(workspace, profile, 'email');
      if (!result.success) {
        setActionError(result.error);
      } else {
        setProfile(result.profile);
        if (editingFact === 'email') setEditingFact(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!profile) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const confirmedAt = getConfirmationTimestamp();
      const lines = addressLinesValue
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const structuredAddress: ResidentialAddress = {
        addressLines: lines,
        locality: localityValue.trim() || undefined,
        region: regionValue.trim() || undefined,
        postalCode: postalCodeValue.trim() || undefined,
        countryCodeOrName: countryValue.trim() || undefined
      };

      const result = await updateAndSaveResidentialAddress(workspace, profile, {
        address: structuredAddress,
        lastConfirmedAt: confirmedAt
      });
      if (!result.success) {
        setActionError(result.error);
      } else {
        setProfile(result.profile);
        setEditingFact(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAddress = async () => {
    if (!profile) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await clearAndSaveFact(workspace, profile, 'residentialAddress');
      if (!result.success) {
        setActionError(result.error);
      } else {
        setProfile(result.profile);
        if (editingFact === 'residentialAddress') setEditingFact(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="applicant-card">
        <div className="loading" role="status">正在加载申请人档案...</div>
      </section>
    );
  }

  if (loadError || !profile) {
    return (
      <section className="applicant-card">
        <h2>申请人档案：{person.displayName}</h2>
        <div role="alert" className="warning">
          <p>{loadError ?? '无法读取人员档案'}</p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBack}>返回申请</button>
        </div>
      </section>
    );
  }

  const dobFact = profile.facts.dateOfBirth;
  const emailFact = profile.facts.email;
  const addressFact = profile.facts.residentialAddress;

  return (
    <section className="applicant-card person-profile-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
        <div>
          <h2>申请人档案：{person.displayName}</h2>
          <p style={{ margin: 0, color: '#4b6269', fontSize: '0.95rem' }}>
            申请人基础信息（仅保存在当前浏览器）
          </p>
        </div>
        <button type="button" className="secondary" onClick={onBack}>返回申请</button>
      </div>

      {actionError ? (
        <div role="alert" className="warning" style={{ marginBottom: '1rem' }}>
          <p>{actionError}</p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {/* 出生日期 */}
        <div className="fact-item" style={{ border: '1px solid #d9e3e6', borderRadius: '12px', padding: '1rem', background: '#fafcfc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1f2933' }}>出生日期 (Date of Birth)</h3>
            {editingFact !== 'dateOfBirth' ? (
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button type="button" onClick={startEditDob} disabled={isSaving}>
                  {dobFact ? '修改' : '填写'}
                </button>
                {dobFact ? (
                  <button type="button" className="secondary" onClick={handleClearDob} disabled={isSaving}>
                    清除
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {editingFact === 'dateOfBirth' ? (
            <div style={{ marginTop: '.75rem' }}>
              <label style={{ display: 'block', marginBottom: '.35rem', fontWeight: 600 }}>
                出生日期 (YYYY-MM-DD)：
              </label>
              <input
                type="text"
                className="new-person-input"
                placeholder="例如 1995-06-15"
                value={dobValue}
                onChange={(e) => setDobValue(e.target.value)}
                disabled={isSaving}
              />
              <div className="actions" style={{ marginTop: '.75rem' }}>
                <button type="button" onClick={handleSaveDob} disabled={isSaving}>保存确认</button>
                <button type="button" className="secondary" onClick={cancelEdit} disabled={isSaving}>取消</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '.25rem 0', fontWeight: dobFact ? 600 : 'normal', color: dobFact ? '#1f2933' : '#61767c' }}>
                {dobFact ? dobFact.date : '尚未填写'}
              </p>
              {dobFact ? (
                <p style={{ margin: '.25rem 0', fontSize: '0.85rem', color: '#61767c' }}>
                  确认时间：{formatConfirmedTimestamp(dobFact.lastConfirmedAt)}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* 联系邮箱 */}
        <div className="fact-item" style={{ border: '1px solid #d9e3e6', borderRadius: '12px', padding: '1rem', background: '#fafcfc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1f2933' }}>联系邮箱 (Email)</h3>
            {editingFact !== 'email' ? (
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button type="button" onClick={startEditEmail} disabled={isSaving}>
                  {emailFact ? '修改' : '填写'}
                </button>
                {emailFact ? (
                  <button type="button" className="secondary" onClick={handleClearEmail} disabled={isSaving}>
                    清除
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {editingFact === 'email' ? (
            <div style={{ marginTop: '.75rem' }}>
              <label style={{ display: 'block', marginBottom: '.35rem', fontWeight: 600 }}>
                邮箱地址：
              </label>
              <input
                type="email"
                className="new-person-input"
                placeholder="例如 applicant@example.com"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                disabled={isSaving}
              />
              <div className="actions" style={{ marginTop: '.75rem' }}>
                <button type="button" onClick={handleSaveEmail} disabled={isSaving}>保存确认</button>
                <button type="button" className="secondary" onClick={cancelEdit} disabled={isSaving}>取消</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '.25rem 0', fontWeight: emailFact ? 600 : 'normal', color: emailFact ? '#1f2933' : '#61767c' }}>
                {emailFact ? emailFact.email : '尚未填写'}
              </p>
              {emailFact ? (
                <p style={{ margin: '.25rem 0', fontSize: '0.85rem', color: '#61767c' }}>
                  确认时间：{formatConfirmedTimestamp(emailFact.lastConfirmedAt)}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* 居住地址 */}
        <div className="fact-item" style={{ border: '1px solid #d9e3e6', borderRadius: '12px', padding: '1rem', background: '#fafcfc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1f2933' }}>居住地址 (Residential Address)</h3>
            {editingFact !== 'residentialAddress' ? (
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button type="button" onClick={startEditAddress} disabled={isSaving}>
                  {addressFact ? '修改' : '填写'}
                </button>
                {addressFact ? (
                  <button type="button" className="secondary" onClick={handleClearAddress} disabled={isSaving}>
                    清除
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {editingFact === 'residentialAddress' ? (
            <div style={{ marginTop: '.75rem', display: 'grid', gap: '.65rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '.25rem', fontWeight: 600 }}>
                  详细地址行（每行一条）：
                </label>
                <textarea
                  className="new-person-input"
                  style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                  placeholder="街道、门牌、公寓单元等"
                  value={addressLinesValue}
                  onChange={(e) => setAddressLinesValue(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '.25rem', fontWeight: 600 }}>城市 / 区县：</label>
                  <input
                    type="text"
                    className="new-person-input"
                    value={localityValue}
                    onChange={(e) => setLocalityValue(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '.25rem', fontWeight: 600 }}>省 / 州 / 大区：</label>
                  <input
                    type="text"
                    className="new-person-input"
                    value={regionValue}
                    onChange={(e) => setRegionValue(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '.25rem', fontWeight: 600 }}>邮政编码：</label>
                  <input
                    type="text"
                    className="new-person-input"
                    value={postalCodeValue}
                    onChange={(e) => setPostalCodeValue(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '.25rem', fontWeight: 600 }}>国家 / 地区：</label>
                  <input
                    type="text"
                    className="new-person-input"
                    placeholder="如 NZ 或 New Zealand"
                    value={countryValue}
                    onChange={(e) => setCountryValue(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="actions" style={{ marginTop: '.75rem' }}>
                <button type="button" onClick={handleSaveAddress} disabled={isSaving}>保存确认</button>
                <button type="button" className="secondary" onClick={cancelEdit} disabled={isSaving}>取消</button>
              </div>
            </div>
          ) : (
            <div>
              {addressFact ? (
                <div style={{ margin: '.25rem 0' }}>
                  {addressFact.address.addressLines?.map((line, idx) => (
                    <div key={idx} style={{ fontWeight: 600, color: '#1f2933' }}>{line}</div>
                  ))}
                  <div style={{ color: '#1f2933' }}>
                    {[
                      addressFact.address.locality,
                      addressFact.address.region,
                      addressFact.address.postalCode,
                      addressFact.address.countryCodeOrName
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  <p style={{ margin: '.4rem 0 0', fontSize: '0.85rem', color: '#61767c' }}>
                    确认时间：{formatConfirmedTimestamp(addressFact.lastConfirmedAt)}
                  </p>
                </div>
              ) : (
                <p style={{ margin: '.25rem 0', color: '#61767c' }}>尚未填写</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
