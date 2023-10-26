import { mapParallelToObject, formatDate, countryToCode } from './utils.js'

const disarmamentGraphQLQuery = (treatyCode) => ({
  operationName: 'Treaty',
  variables: { input: { id: null, short_name: treatyCode, type: 'GET_TREATY' } },
  query: `query Treaty($input: TreatyRequestInput_) {
    treaty_(input: $input) {
      ... on ReadResponse {
        data {
          ... on Treaty_ {
            id
            description
            full_name
            is_protocol
            name
            protocol_parent_id
            protocols_ {
              id
              name
              short_name
              count_states_parties
              adopted_date
              open_for_signature_date
              __typename
            }
            short_name
            treaty_text
            note
            is_amendment
            signature_location
            show_deposit_location
            show_signature_location
            show_signature_for_protocol
            adopted_date
            adopted_location
            open_for_signature_date
            entry_into_force_date
            entry_into_force_note
            search_keywords
            certified_copy_url
            count_sig_states
            count_states_parties
            depositaries_ {
              id
              short_name
              name
              url_name
              __typename
            }
            actions_ {
              id
              date
              note
              type
              action_type_
              state {
                name
                country_id
                country_ {
                  country_persistent_name
                  country_country_name {
                    countryname_official_short_name
                    countryname_official_long_name
                    countryname_country_code_2
                    __typename
                  }
                  country_country_groups {
                    countrygroup_group_name
                    countrygroup_group_type
                    __typename
                  }
                  __typename
                }
                __typename
              }
              depositary {
                id
                short_name
                name
                url_name
                __typename
              }
              objections_ {
                date
                note
                state {
                  country_ {
                    country_persistent_name
                    country_country_name {
                      countryname_country_code_3
                      countryname_official_short_name
                      __typename
                    }
                    __typename
                  }
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }`
})

const rawDisarmamentTreatyData = async (treatyCode) => {
  const response = await fetch('https://gql-api-dataportal.unoda.org/', {
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(disarmamentGraphQLQuery(treatyCode)),
    method: 'POST'
  })
  const json = await response.json()
  return json.data.treaty_.data
}

const gatherDisarmamentData = (rawData) => {
  const actions = rawData.actions_
  const results = {}
  for (const action of actions) {
    let countryCode = action.state.country_.country_country_name?.countryname_country_code_2
    if (countryCode === undefined || countryCode === 'XX') {
      countryCode = countryToCode(action.state.country_.country_country_name?.countryname_official_short_name ?? action.state.country_.country_persistent_name)
    }
    results[countryCode] ||= {}
    const result = results[countryCode]
    const date = formatDate(new Date(action.date))
    const joiningMechanism = action.type
    if (joiningMechanism === 'SIG') {
      result.signed = date
    }
    if (joiningMechanism === 'RAT') {
      result.joined = date
      result.joiningMechanism = 'ratified'
    }
    if (joiningMechanism === 'ACC') {
      result.joined = date
      result.joiningMechanism = 'acceded'
    }
    if (joiningMechanism === 'SUC') {
      result.joined = date
      result.joiningMechanism = 'succeeded'
    }
  }
  return results
}

const disarmamentTreatyInfo = async (treaty) => {
  const raw = await rawDisarmamentTreatyData(treaty.code)
  return gatherDisarmamentData(raw)
}

export const disarmament = async (treaties) =>
  mapParallelToObject(async treaty => [
    treaty.code,
    await disarmamentTreatyInfo(treaty)
  ], treaties)
