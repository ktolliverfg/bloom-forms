// pass in a dict of field / value pairs to the aggregator as testDataObject
// example testDataObject:
/*
  {
    [fieldName]: { value: fieldValue, validateAs: 'not-empty', name: fieldName},
    [fieldName]: { value: fieldValue, validateAs: 'phone', name: fieldName},
    ...
  }
*/

// pass in error language from a localization file or json object of error messages

// pass in an optDic of validateAs keys with functions to process. for example:
/*
  {
    'cat': (testData) => testData === 'cat' ? null : 'This field should equal "cat."',
    'biggerThan2': (testData) => testData > 2 ? null : 'This field must be at least 2'
  }
*/
// and now you can use validateAs='cat' and validateAs='biggerThan2'

export async function validatorAggregator(
  testDataObject = {},
  errorLanguage = null,
  optDict = null
) {
  let status = { isValid: true, warnings: {} }

  const dict = {
    date: dateError,
    email: emailError,
    file: fileError,
    name: nameError,
    'not-empty': notEmptyError,
    number: numberError,
    'number-field': numberFieldError,
    phone: phoneError,
    zip: zipError,
    ...optDict
  }

  for (let field in testDataObject) {
    let thisField = testDataObject[field]
    if (thisField.validateAs) {
      // multiple validateAs;
      if (thisField.validateAs.indexOf(' ') > -1) {
        for (let validateAs of thisField.validateAs.split(' ')) {
          status = await validate(
            status,
            thisField.value,
            validateAs,
            thisField.name,
            dict,
            errorLanguage
          )
        }
      } else {
        status = await validate(
          status,
          thisField.value,
          thisField.validateAs,
          thisField.name,
          dict,
          errorLanguage
        )
      }
    }
  }

  return status
}

const validate = async (
  prevStatus,
  testData,
  validateAs,
  fieldName,
  dict,
  errorLanguage
) => {
  if (!dict[validateAs]) {
    throw new Error(
      `${validateAs} is not defined in your validationHelp dictionary.`
    )
  }

  try {
    let error = await dict[validateAs](testData, fieldName, errorLanguage)
    prevStatus.warnings[fieldName] = error

    return { ...prevStatus, isValid: prevStatus.isValid && !error }
  } catch (err) {
    throw new Error(`Error in validation: ${err.toString()}`)
  }
}

function dateError(testData, fieldName, errorLanguage) {
  // const dateRegex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/
  // return dateRegex.test(testData) ? null : errorLanguage ? errorLanguage['invalid-date']
  return new Date(testData) != 'Invalid Date'
    ? null
    : errorLanguage && errorLanguage['invalid-date']
      ? errorLanguage['invalid-date']
      : 'Please enter a valid date.'
}

function emailError(testData, fieldName, errorLanguage) {
  const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return emailRegex.test(testData)
    ? null
    : errorLanguage && errorLanguage['invalid-email']
      ? errorLanguage['invalid-email']
      : 'Please enter a valid email.'
}

function fileError(testData, fieldName, errorLanguage) {
  return testData.files && testData.files[0] && testData.files[0].size > 100000
    ? errorLanguage && errorLanguage['file-size']
      ? errorLanguage['file-size']
      : 'Maximum file size exceeded.'
    : null
}

function nameError(testData, fieldName, errorLanguage) {
  return testData.length < 2
    ? errorLanguage && errorLanguage['min-length']
      ? errorLanguage['min-length']
          .replace('<FIELD>', fieldName)
          .replace('<LIMIT>', '2')
      : 'This field must be at least 2 characters.'
    : null
}

function notEmptyError(testData, fieldName, errorLanguage) {
  return !testData && testData !== 0
    ? errorLanguage && errorLanguage['not-empty']
      ? errorLanguage['not-empty'].replace('<FIELD>', fieldName)
      : 'This field cannot be empty.'
    : null
}

function numberError(testData, fieldName, errorLanguage) {
  return !testData || !/^[0-9]+$/.test(testData)
    ? errorLanguage
      ? errorLanguage['invalid-number']
      : 'Please enter a valid number.'
    : null
}

function numberFieldError(testData, fieldName, errorLanguage) {
  return !testData || !/^[0-9]+$/.test(testData)
    ? errorLanguage
      ? errorLanguage['invalid-field'].replace('<FIELD>', fieldName)
      : 'This field is invalid.'
    : null
}

function phoneError(testData, fieldName, errorLanguage) {
  if (testData.length < 8) {
    return errorLanguage && errorLanguage['min-length']
      ? errorLanguage['min-length']
          .replace('<FIELD>', errorLanguage.fieldLabels.phoneNumber)
          .replace('<LIMIT>', '8')
      : 'This field must be at least 8 chars.'
  } else if (testData.length > 15) {
    return errorLanguage && errorLanguage['max-length']
      ? errorLanguage['max-length']
          .replace('<FIELD>', errorLanguage.fieldLabels.phoneNumber)
          .replace('<LIMIT>', '15')
      : 'This field cannot exceed 15 chars.'
  } else {
    return null
  }
}

function zipError(testData, fieldName, errorLanguage) {
  const usZipRegex = /^\d{5}(?:[-\s]\d{4})?$/
  return usZipRegex.test(testData)
    ? null
    : errorLanguage && errorLanguage['invalid-field']
      ? errorLanguage['invalid-field'].replace(
          '<FIELD>',
          errorLanguage.fieldLabels.zip
        )
      : 'Please enter a valid postal code.'
}
