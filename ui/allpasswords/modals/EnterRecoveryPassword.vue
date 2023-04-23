<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay @cancel="done(null)">
    <ValidatedForm class="modal-form" @validated="done(password)" @reset.prevent="done(null)">
      <div>{{ $t("description") }}</div>
      <label class="block-start" for="recovery-password">{{ $t("/(panel)(components)(RecoveryCode)password_label") }}</label>
      <PasswordInput
        id="recovery-password" v-model="password"
        v-model:error="passwordError" :default-focus="true"
        @validate="validatePassword"
      />
      <div v-if="passwordError" class="error">
        {{ passwordError }}
      </div>
      <label class="block-start" for="recovery-password-repeat">{{ $t("password_repeat") }}</label>
      <PasswordInput
        id="recovery-password-repeat" v-model="passwordRepeat"
        v-model:error="passwordRepeatError"
        @validate="validatePasswordRepeat"
      />
      <div v-if="passwordRepeatError" class="error">
        {{ passwordRepeatError }}
      </div>
      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </ValidatedForm>
  </ModalOverlay>
</template>

<script>
"use strict";

export default {
  name: "EnterRecoveryPassword",
  localePath: "allpasswords/modals/EnterRecoveryPassword",
  emits: ["done"],
  data()
  {
    return {
      password: "",
      passwordError: null,
      passwordRepeat: "",
      passwordRepeatError: null
    };
  },
  methods: {
    validatePassword(value, setError)
    {
      if (!value)
        setError(this.$t("/(panel)(components)(RecoveryCode)password_required"));
    },
    validatePasswordRepeat(value, setError)
    {
      if (value != this.password)
        setError(this.$t("passwords_do_not_match"));
    },
    done(result)
    {
      this.$emit("done", result);
    }
  }
};
</script>
